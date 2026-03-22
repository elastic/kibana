/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import type { DataRequestHandlerContext } from '@kbn/data-plugin/server';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { NewPackagePolicy, UpdatePackagePolicy } from '@kbn/fleet-plugin/common';

import type { Subscription } from 'rxjs';
import {
  getInternalSavedObjectsClient,
  getInternalSavedObjectsClientForSpaceId,
} from './utils/get_internal_saved_object_client';
import { upgradeIntegration } from './utils/upgrade_integration';
import type { PackSavedObject } from './common/types';
import { updateGlobalPacksCreateCallback } from './lib/update_global_packs';
import { packSavedObjectType } from '../common/types';
import { createConfig } from './create_config';
import type { OsqueryPluginSetup, OsqueryPluginStart, SetupPlugins, StartPlugins } from './types';
import { defineRoutes } from './routes';
import { osquerySearchStrategyProvider } from './search_strategy/osquery';
import { initSavedObjects } from './saved_objects';
import type { OsqueryAppContext } from './lib/osquery_app_context_services';
import { OsqueryAppContextService } from './lib/osquery_app_context_services';
import type { ConfigType } from '../common/config';
import { OSQUERY_INTEGRATION_NAME } from '../common';
import {
  getPackagePolicyDeleteCallback,
  getAgentPolicyPostUpdateCallback,
} from './lib/fleet_integration';
import { TelemetryEventsSender } from './lib/telemetry/sender';
import { TelemetryReceiver } from './lib/telemetry/receiver';
import { initializeTransformsIndices } from './create_indices/create_transforms_indices';
import { initializeTransforms } from './create_transforms/create_transforms';
import { createDataViews } from './create_data_views';

import { registerFeatures } from './utils/register_features';
import { CASE_ATTACHMENT_TYPE_ID } from '../common/constants';
import { createActionService } from './handlers/action/create_action_service';
import { backfillScheduleIds } from './lib/backfill_schedule_ids';
import { initializeComplianceIndices } from './compliance/create_indices';
import { installPrebuiltRules } from './compliance/services/install_prebuilt_rules';
import { computeAndWriteScores } from './compliance/services/compliance_scoring_service';
import { getMutedRulesState } from './compliance/services/compliance_rules_service';
import { FindingEvaluatorService } from './compliance/services/finding_evaluator_service';
import { ComplianceTransformService } from './compliance/services/transform_service';
import { ComplianceIndexManagementService } from './compliance/services/index_management_service';
import { ComplianceTransformMonitoringService, transformMonitoringTaskDefinition } from './compliance/services/transform_monitoring_service';
import { ComplianceTransformCleanupService } from './compliance/services/transform_cleanup_service';
import { COMPLIANCE_SCORE_AGGREGATION_TASK_TYPE } from '../common/compliance';

const BACKFILL_TASK_TYPE = 'osquery:backfillScheduleIds';

export class OsqueryPlugin implements Plugin<OsqueryPluginSetup, OsqueryPluginStart> {
  private readonly logger: Logger;
  private context: PluginInitializerContext;
  private readonly osqueryAppContextService = new OsqueryAppContextService();
  private readonly telemetryReceiver: TelemetryReceiver;
  private readonly telemetryEventsSender: TelemetryEventsSender;
  private coreStart: CoreStart | null = null;
  private licenseSubscription: Subscription | null = null;
  private createActionService: ReturnType<typeof createActionService> | null = null;
  private config: ConfigType | null = null;
  private findingEvaluator: FindingEvaluatorService | null = null;
  private complianceTransformService: ComplianceTransformService | null = null;
  private complianceIndexManagementService: ComplianceIndexManagementService | null = null;
  private complianceTransformMonitoringService: ComplianceTransformMonitoringService | null = null;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.context = initializerContext;
    this.logger = initializerContext.logger.get();
    this.telemetryEventsSender = new TelemetryEventsSender(this.logger);
    this.telemetryReceiver = new TelemetryReceiver(this.logger);
  }

  public setup(core: CoreSetup<StartPlugins, OsqueryPluginStart>, plugins: SetupPlugins) {
    this.logger.debug('osquery: Setup');
    const config = createConfig(this.initializerContext);
    this.config = config;
    const experimentalFeatures = config.experimentalFeatures;

    registerFeatures(plugins.features);

    const router = core.http.createRouter<DataRequestHandlerContext>();

    const osqueryContext: OsqueryAppContext = {
      logFactory: this.context.logger,
      getStartServices: core.getStartServices,
      service: this.osqueryAppContextService,
      config: (): ConfigType => config,
      experimentalFeatures,
      security: plugins.security,
      telemetryEventsSender: this.telemetryEventsSender,
      licensing: plugins.licensing,
    };

    initSavedObjects(core.savedObjects, {
      complianceEnabled: experimentalFeatures.endpointComplianceMonitoring,
    });

    // TODO: We do not pass so client here.
    this.createActionService = createActionService(osqueryContext);

    core
      .getStartServices()
      .then(([{ elasticsearch }, depsStart]) => {
        const osquerySearchStrategy = osquerySearchStrategyProvider(
          depsStart.data,
          elasticsearch.client
        );

        plugins.data.search.registerSearchStrategy('osquerySearchStrategy', osquerySearchStrategy);
        defineRoutes(router, osqueryContext);
      })
      .catch((err) => {
        this.logger.error(`Failed to register osquery routes: ${err.message}`);
        this.logger.error(err.stack);
      });

    this.telemetryEventsSender.setup(this.telemetryReceiver, plugins.taskManager, core.analytics);

    plugins.taskManager?.registerTaskDefinitions({
      [BACKFILL_TASK_TYPE]: {
        title: 'Backfill schedule IDs for osquery pack queries',
        timeout: '5m',
        maxAttempts: 3,
        createTaskRunner: ({ taskInstance, abortController }) => ({
          run: async () => {
            if (taskInstance.state?.completed) {
              this.logger.debug('backfillScheduleIds task: already completed, skipping');

              return { state: { completed: true } };
            }

            if (!this.coreStart) {
              throw new Error('Core not started');
            }

            const { hadFailures } = await backfillScheduleIds({
              coreStart: this.coreStart,
              osqueryContext: this.osqueryAppContextService,
              logger: this.logger,
              abortController,
            });

            return { state: { completed: !hadFailures } };
          },
        }),
      },
    });

    plugins.cases?.attachmentFramework.registerExternalReference({ id: CASE_ATTACHMENT_TYPE_ID });

    if (experimentalFeatures.endpointComplianceMonitoring && plugins.taskManager) {
      plugins.taskManager.registerTaskDefinitions({
        [COMPLIANCE_SCORE_AGGREGATION_TASK_TYPE]: {
          title: 'Endpoint compliance score aggregation',
          timeout: '5m',
          maxAttempts: 3,
          createTaskRunner: () => ({
            run: async () => {
              if (!this.coreStart) throw new Error('Core not started');
              const esClient = this.coreStart.elasticsearch.client.asInternalUser;
              const soClient = await getInternalSavedObjectsClient(this.coreStart);
              const mutedRules = await getMutedRulesState(soClient);
              await computeAndWriteScores(esClient, mutedRules, 'default', this.logger);

              return { state: {} };
            },
          }),
        },
        // Register transform monitoring task
        [transformMonitoringTaskDefinition.type]: transformMonitoringTaskDefinition,
      });
    }

    return {
      createActionService: this.createActionService,
    };
  }

  public start(core: CoreStart, plugins: StartPlugins) {
    this.logger.debug('osquery: Started');
    this.coreStart = core;
    const registerIngestCallback = plugins.fleet?.registerExternalCallback;
    this.osqueryAppContextService.start({
      ...plugins.fleet,
      ruleRegistryService: plugins.ruleRegistry,
      // @ts-expect-error update types
      config: this.config!,
      logger: this.logger,
      registerIngestCallback,
      spacesService: plugins.spaces?.spacesService,
    });

    this.telemetryReceiver.start(core, this.osqueryAppContextService);

    this.telemetryEventsSender.start(plugins.taskManager, this.telemetryReceiver);

    plugins.fleet
      ?.fleetSetupCompleted()
      .then(async () => {
        const packageInfo = await plugins.fleet?.packageService.asInternalUser.getInstallation(
          OSQUERY_INTEGRATION_NAME
        );
        const client = await getInternalSavedObjectsClient(core);

        const esClient = core.elasticsearch.client.asInternalUser;
        const dataViewsService = await plugins.dataViews.dataViewsServiceFactory(
          client,
          esClient,
          undefined,
          true
        );

        // If package is installed we want to make sure all needed assets are installed
        if (packageInfo) {
          await this.initialize(core, dataViewsService);
        }

        if (this.config?.experimentalFeatures.endpointComplianceMonitoring) {
          try {
            // Initialize compliance infrastructure with transform deployment
            await this.initializeComplianceInfrastructure(esClient, client, plugins);
          } catch (error) {
            this.logger.error('Failed to initialize compliance infrastructure:', error);
            // Continue with basic initialization even if transform deployment fails
            await initializeComplianceIndices(esClient, this.logger, plugins.dataViews);
            await installPrebuiltRules(client, this.logger);
          }

          // Initialize finding evaluator
          this.findingEvaluator = new FindingEvaluatorService(esClient, client, this.logger);
          this.findingEvaluator.start();

          // Schedule compliance score aggregation task
          plugins.taskManager
            ?.ensureScheduled({
              id: COMPLIANCE_SCORE_AGGREGATION_TASK_TYPE,
              taskType: COMPLIANCE_SCORE_AGGREGATION_TASK_TYPE,
              scope: ['osquery'],
              schedule: { interval: '5m' },
              params: {},
              state: {},
            })
            .catch((err) => {
              this.logger.warn(`Failed to schedule compliance score task: ${err.message}`);
            });
        }

        // Upgrade integration into 1.6.0 and rollover if found 'generic' dataset - we do not want to wait for it
        upgradeIntegration({ packageInfo, client, esClient, logger: this.logger }).catch(() => {
          // we do not want to wait for it
        });

        plugins.taskManager
          ?.ensureScheduled({
            id: BACKFILL_TASK_TYPE,
            taskType: BACKFILL_TASK_TYPE,
            scope: ['osquery'],
            schedule: { interval: '24h' },
            params: {},
            state: {},
          })
          .catch((err) => {
            this.logger.warn(`Failed to schedule backfillScheduleIds task: ${err.message}`);
          });

        if (registerIngestCallback) {
          registerIngestCallback(
            'packagePolicyCreate',
            async (
              newPackagePolicy: NewPackagePolicy,
              soClient: SavedObjectsClientContract
            ): Promise<UpdatePackagePolicy> => {
              if (newPackagePolicy.package?.name === OSQUERY_INTEGRATION_NAME) {
                await this.initialize(core, dataViewsService);
                const allPacks = await client
                  .find<PackSavedObject>({
                    type: packSavedObjectType,
                  })
                  .then((data) => ({
                    ...data,
                    saved_objects: data.saved_objects.map((pack) => ({
                      ...pack.attributes,
                      saved_object_id: pack.id,
                      references: pack.references,
                    })),
                  }));

                if (allPacks.saved_objects) {
                  const spaceScopedClient = getInternalSavedObjectsClientForSpaceId(
                    core,
                    soClient.getCurrentNamespace()
                  );

                  return updateGlobalPacksCreateCallback(
                    newPackagePolicy,
                    spaceScopedClient,
                    allPacks.saved_objects,
                    this.osqueryAppContextService,
                    soClient.getCurrentNamespace()
                  );
                }
              }

              return newPackagePolicy;
            }
          );

          registerIngestCallback('packagePolicyPostDelete', getPackagePolicyDeleteCallback(client));
          registerIngestCallback('agentPolicyPostUpdate', getAgentPolicyPostUpdateCallback(core));
        }
      })
      .catch(() => {
        // it shouldn't reject, but just in case
      });

    return {};
  }

  public stop() {
    this.logger.debug('osquery: Stopped');
    this.telemetryEventsSender.stop();
    this.osqueryAppContextService.stop();
    this.licenseSubscription?.unsubscribe();
    this.createActionService?.stop();
    this.findingEvaluator?.stop();
    this.complianceTransformMonitoringService?.stopMonitoring().catch((err) => {
      this.logger.warn(`Failed to stop transform monitoring: ${err.message}`);
    });
  }

  async initialize(core: CoreStart, dataViewsService: DataViewsService): Promise<void> {
    this.logger.debug('initialize');
    await initializeTransformsIndices(core.elasticsearch.client.asInternalUser, this.logger);
    await initializeTransforms(core.elasticsearch.client.asInternalUser, this.logger);
    await createDataViews(dataViewsService);
  }

  private async initializeComplianceInfrastructure(
    esClient: any,
    client: any,
    plugins: any
  ): Promise<void> {
    this.logger.info('Initializing compliance infrastructure with transform deployment...');

    // Initialize basic compliance indices and rules first
    await initializeComplianceIndices(esClient, this.logger, plugins.dataViews);
    await installPrebuiltRules(client, this.logger);

    // Initialize services
    this.complianceIndexManagementService = new ComplianceIndexManagementService(
      esClient,
      this.logger
    );
    this.complianceTransformService = new ComplianceTransformService(esClient, this.logger);
    this.complianceTransformMonitoringService = new ComplianceTransformMonitoringService(
      esClient,
      plugins.taskManager,
      this.logger
    );

    try {
      // Deploy findings_latest infrastructure (templates, policies, indices)
      await this.complianceIndexManagementService.deployFindingsLatestInfrastructure();
      this.logger.info('Successfully deployed findings_latest infrastructure');

      // Create and start the findings_latest transform
      await this.complianceTransformService.createFindingsLatestTransform();
      await this.complianceTransformService.startTransform();
      this.logger.info('Successfully deployed and started findings_latest transform');

      // Validate infrastructure health
      const infraHealth = await this.complianceIndexManagementService.validateInfrastructureHealth();
      if (!infraHealth.isHealthy) {
        this.logger.warn('Infrastructure health check found issues:', infraHealth.issues);
      }

      const transformHealth = await this.complianceTransformService.validateTransformHealth();
      if (!transformHealth.isHealthy) {
        this.logger.warn('Transform health check found issues:', transformHealth.issues);
      }

      // Start transform monitoring
      const transformIds = ['endpoint_compliance_findings_latest'];
      await this.complianceTransformMonitoringService.startMonitoring(transformIds);
      this.logger.info('Successfully started transform monitoring');

    } catch (error) {
      this.logger.error('Failed to deploy compliance transform infrastructure:', error);

      // Attempt cleanup on failure
      try {
        if (this.complianceTransformService) {
          await this.complianceTransformService.deleteTransform();
        }
        if (this.complianceIndexManagementService) {
          await this.complianceIndexManagementService.cleanupFindingsLatestInfrastructure();
        }
        this.logger.info('Successfully cleaned up after failed deployment');
      } catch (cleanupError) {
        this.logger.error('Failed to cleanup after deployment failure:', cleanupError);
      }

      // Re-throw to trigger fallback initialization
      throw error;
    }
  }

  /**
   * Cleans up compliance transform infrastructure when feature is disabled.
   * This can be called manually or automatically when the feature flag is turned off.
   */
  async cleanupComplianceInfrastructure(
    esClient: any,
    cleanupType: 'full' | 'graceful' | 'emergency' = 'graceful'
  ): Promise<{
    success: boolean;
    cleanupSteps: { step: string; success: boolean; error?: string }[];
  }> {
    this.logger.info(`Starting ${cleanupType} cleanup of compliance transform infrastructure...`);

    const cleanupService = new ComplianceTransformCleanupService(esClient, this.logger);

    try {
      let cleanupResult;

      switch (cleanupType) {
        case 'full':
          cleanupResult = await cleanupService.performFullCleanup();
          break;
        case 'emergency':
          cleanupResult = await cleanupService.performEmergencyCleanup();
          break;
        case 'graceful':
        default:
          cleanupResult = await cleanupService.performGracefulCleanup();
          break;
      }

      // Validate cleanup was successful
      const validationResult = await cleanupService.validateCleanup();
      if (!validationResult.isClean) {
        this.logger.warn('Cleanup validation found remaining resources:', validationResult.remainingResources);
      }

      // Stop local services
      if (this.findingEvaluator) {
        this.findingEvaluator.stop();
        this.findingEvaluator = null;
      }

      if (this.complianceTransformMonitoringService) {
        await this.complianceTransformMonitoringService.stopMonitoring();
        this.complianceTransformMonitoringService = null;
      }

      // Clear service references
      this.complianceTransformService = null;
      this.complianceIndexManagementService = null;

      return cleanupResult;
    } catch (error) {
      this.logger.error('Failed to cleanup compliance infrastructure:', error);
      return {
        success: false,
        cleanupSteps: [
          {
            step: 'Cleanup service execution',
            success: false,
            error: error.message,
          },
        ],
      };
    }
  }
}
