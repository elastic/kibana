/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  KibanaRequest,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { SavedObjectsClient } from '@kbn/core/server';
import { registerRoutes } from '@kbn/server-route-repository';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { RulesClientCreateOptions } from '@kbn/alerting-plugin/server';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  exhaustMap,
  filter,
  from,
  of,
  skip,
  switchMap,
  timer,
} from 'rxjs';
import type { Subscription } from 'rxjs';
import { PROJECT_ROUTING_ALL } from '@kbn/cps-server-utils';
import {
  getRelayAppConnectionSavedObjectType,
  RELAY_APP_CONNECTION_SO_TYPE,
} from './lib/slack_app/saved_object';
import { SlackAppService } from './lib/slack_app/service';
import { getSignificantEventsMaintenanceStateSavedObjectType } from './lib/maintenance/saved_object';
import { runQuotaLedgerSavedObjectType, runQuotaSettingsSavedObjectType } from './lib/run_quotas';
import {
  createSignificantEventsMaintenanceService,
  type SignificantEventsMaintenanceService,
} from './lib/maintenance/maintenance_service';
import { createMaintenanceSystemRequest } from './lib/maintenance/system_request';
import {
  createManagedWorkflowsInstaller,
  type ManagedWorkflowsInstaller,
} from './lib/workflows/setup/managed_workflows_installer';
import { registerFeatureFlags } from './feature_flags';
import { getSignificantEventsTuningConfig } from './lib/significant_events/helpers/get_significant_events_tuning_config';
import { deleteLegacyRules } from './lib/significant_events/rules/delete_legacy_rules';

import { createSignificantEventsAlertingContextResolver } from './lib/significant_events/alerting/significant_events_alerting_context';
import type { SignificantEventsAlertingContext } from './lib/significant_events/alerting/significant_events_alerting_context';
import { EbtTelemetryService } from './lib/telemetry/ebt';
import { significantEventsRouteRepository } from './routes';
import type { GetScopedClients, RouteHandlerScopedClients } from './routes/types';
import type {
  SignificantEventsPluginSetupDependencies,
  SignificantEventsPluginStartDependencies,
  SignificantEventsServer,
} from './types';
import {
  type KnowledgeIndicatorClient,
  KnowledgeIndicatorService,
  initializeKnowledgeIndicatorsTemplate,
} from './lib/knowledge_indicators';
import {
  createSignificantEventsClients,
  createSignificantEventsServices,
  initializeSignificantEventsTemplates,
} from './lib/significant_events/significant_events_clients';
import { createMemoryToolsOptions, registerStreamsAgentBuilder } from './agent_builder/register';
import { registerSignificantEventsSkills } from './agent_builder/skills/register_skills';
import { registerAgentBuilderSmlTypes } from './agent_builder/sml/register_sml_types';
import { registerStreamsMemoryAgentBuilder } from './memory_and_investigation/skills/memory/register';
import { registerSignificantEventsInferenceFeatures } from './register_significant_events_inference_features';
import {
  createContinuousKiOnboardingWorkflowService,
  type ContinuousKiOnboardingWorkflowService,
} from './lib/workflows/continuous_onboarding_workflow';
import {
  createCleanupWorkflowService,
  type CleanupWorkflowService,
} from './lib/workflows/cleanup_workflow';
import { createSyncWorkflowService, type SyncWorkflowService } from './lib/workflows/sync_workflow';
import {
  createSignificantEventsScheduledWorkflowsService,
  type SignificantEventsScheduledWorkflowsService,
} from './lib/workflows/significant_events_scheduled_workflows';
import { createWorkflowClients } from './lib/workflows/create_workflow_clients';
import { registerSignificantEventsWorkflowTriggers } from './workflows/triggers/register_triggers';
import { createTriggerEmitter } from './workflows/triggers/emit';
import {
  installDiscoveryAgents,
  registerSignificantEventsDiscoveryAgentTypes,
} from './agent_builder/agents/discovery';
import { createSignificantEventsAvailability } from './agent_builder/tools/significant_events_availability';
import { SIGNIFICANT_EVENT_TIERED_FEATURES } from '../common/constants';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '../common/feature_flags';
import { isSignificantEventsAvailable } from './routes/utils/assert_significant_events_access';
import type { SignificantEventsKIsOnboardingClient } from './lib/workflows/onboarding_workflow_client';

const SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER = 'significantEvents';
const SLACK_CONNECTOR_RECONCILE_INTERVAL_MS = 60_000;

export class SignificantEventsPlugin
  implements
    Plugin<
      void,
      void,
      SignificantEventsPluginSetupDependencies,
      SignificantEventsPluginStartDependencies
    >
{
  public logger: Logger;
  public server?: SignificantEventsServer;
  private isDev: boolean;
  private ebtTelemetryService = new EbtTelemetryService();
  private getScopedClients?: GetScopedClients;
  private subscriptions: Subscription[] = [];
  private kibanaVersion: string;
  private streamsKIsOnboardingClient?: SignificantEventsKIsOnboardingClient;
  private managedWorkflowsInstaller?: ManagedWorkflowsInstaller;
  private maintenanceService?: SignificantEventsMaintenanceService;

  constructor(context: PluginInitializerContext) {
    this.isDev = context.env.mode.dev;
    this.logger = context.logger.get();
    this.kibanaVersion = context.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SignificantEventsPluginStartDependencies>,
    plugins: SignificantEventsPluginSetupDependencies
  ): void {
    this.server = {
      logger: this.logger,
      workflowsManagement: plugins.workflowsManagement,
      cloud: plugins.cloud,
      kibanaVersion: this.kibanaVersion,
    } as SignificantEventsServer;
    this.server.workflowsManagement = plugins.workflowsManagement;

    core.savedObjects.registerType(getRelayAppConnectionSavedObjectType());
    core.savedObjects.registerType(getSignificantEventsMaintenanceStateSavedObjectType());
    core.savedObjects.registerType(runQuotaSettingsSavedObjectType);
    core.savedObjects.registerType(runQuotaLedgerSavedObjectType);

    this.ebtTelemetryService.setup(core.analytics);

    registerSignificantEventsInferenceFeatures(
      plugins.searchInferenceEndpoints,
      this.logger.get('inference-features')
    );

    const significantEventsServices = createSignificantEventsServices();
    const knowledgeIndicatorService = new KnowledgeIndicatorService(core, this.logger);
    const { streams: streamsSetup } = plugins;

    this.getScopedClients = async ({
      request,
      rulesClientOptions,
    }: {
      request: KibanaRequest;
      rulesClientOptions?: RulesClientCreateOptions;
    }): Promise<RouteHandlerScopedClients> => {
      const [coreStart, pluginsStart] = await core.getStartServices();
      const isServerless = plugins.cloud?.isServerlessEnabled ?? false;

      const scopedSoClient = coreStart.savedObjects.getScopedClient(request);
      const uiSettingsClient = coreStart.uiSettings.asScopedToClient(scopedSoClient);
      const globalUiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(scopedSoClient);

      // `scopedClusterClient`: origin-only. Used for everything the plugin owns (its hidden
      // data streams), which only ever exists in the origin project.
      // `streamDataEsClient`: always routed across every CPS-linked project, regardless of the
      // active space's project routing expression. Knowledge indicators are not space-scoped -
      // they model all data available to a stream - so extraction must always read across every
      // linked project.
      //
      // Detection matches that all-projects scope on serverless via `withAllProjectsRouting`.
      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
      const streamDataEsClient = coreStart.elasticsearch.client.asScoped(request, {
        projectRouting: 'expression',
        value: PROJECT_ROUTING_ALL,
      }).asCurrentUser;
      const soClient = scopedSoClient;
      const inferenceClient = pluginsStart.inference.getClient({ request });
      const licensing = pluginsStart.licensing;
      const fieldsMetadataClient = await pluginsStart.fieldsMetadata.getClient(request);

      const [attachmentClient, tuningConfig] = await Promise.all([
        streamsSetup.getAttachmentClient({ request }),
        getSignificantEventsTuningConfig(globalUiSettingsClient, this.logger),
      ]);

      const streamsClient = await streamsSetup.getStreamsClient({ request, rulesClientOptions });

      const space = pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;

      const significantEventsClients = createSignificantEventsClients({
        services: significantEventsServices,
        esClient: scopedClusterClient.asCurrentUser,
        space,
        triggerEmitter: createTriggerEmitter({
          workflowsExtensions: pluginsStart.workflowsExtensions,
          request,
          logger: this.logger,
        }),
      });

      const getAlertingV2RulesClient = async () =>
        pluginsStart.alertingVTwo.getRulesClientWithRequestInSpace(request, DEFAULT_SPACE_ID);

      const deleteLegacyRulesById = async (ruleIds: string[]): Promise<void> => {
        if (ruleIds.length === 0) {
          return;
        }
        const rulesClient = await pluginsStart.alerting.getRulesClientWithRequestInSpace(
          request,
          DEFAULT_SPACE_ID,
          rulesClientOptions
        );
        await deleteLegacyRules(rulesClient, ruleIds);
      };

      const resolveSignificantEventsAlertingContext =
        createSignificantEventsAlertingContextResolver({
          getAlertingV2RulesClient,
          isServerless,
        });

      const createKnowledgeIndicatorClient = (context: SignificantEventsAlertingContext) =>
        knowledgeIndicatorService.getClient({
          esClient: scopedClusterClient.asInternalUser,
          soClient,
          context,
          config: tuningConfig,
        });

      let kiClientPromise: ReturnType<typeof createKnowledgeIndicatorClient> | undefined;
      const getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient> = () => {
        kiClientPromise ??= (async () =>
          createKnowledgeIndicatorClient(await resolveSignificantEventsAlertingContext()))();
        return kiClientPromise;
      };

      const license = await licensing.getLicense();
      const isSecurityEnabled = license.getFeature('security').isEnabled;

      return {
        scopedClusterClient,
        streamDataEsClient,
        soClient,
        attachmentClient,
        getSignificantEventsAlertingContext: resolveSignificantEventsAlertingContext,
        getKnowledgeIndicatorClient,
        deleteLegacyRules: deleteLegacyRulesById,
        ...significantEventsClients,
        inferenceClient,
        fieldsMetadataClient,
        streamsClient,
        licensing,
        uiSettingsClient,
        globalUiSettingsClient,
        isSecurityEnabled,
        tuningConfig,
      };
    };

    streamsSetup.registerKnowledgeIndicatorClientProvider(async (request) => {
      const { getKnowledgeIndicatorClient } = await this.getScopedClients!({ request });
      return getKnowledgeIndicatorClient();
    });

    const telemetryClient = this.ebtTelemetryService.getClient();

    const workflowClients = createWorkflowClients(
      plugins.workflowsManagement?.management,
      telemetryClient
    );
    const streamsKIsOnboardingClient = workflowClients.streamsKIsOnboardingClient;
    this.streamsKIsOnboardingClient = streamsKIsOnboardingClient;

    if (plugins.agentBuilderSml && this.getScopedClients) {
      registerAgentBuilderSmlTypes({
        agentBuilderSml: plugins.agentBuilderSml,
        getScopedClients: this.getScopedClients,
      });
    }

    if (plugins.agentBuilder) {
      registerSignificantEventsDiscoveryAgentTypes({ agentBuilder: plugins.agentBuilder });
      void core
        .getStartServices()
        .then(async () => {
          const { getScopedClients, server } = this;
          if (!getScopedClients || !server) return;
          await registerStreamsAgentBuilder({
            agentBuilder: plugins.agentBuilder!,
            getScopedClients,
            server,
            logger: this.logger,
            telemetry: telemetryClient,
          });
        })
        .catch((err) => {
          this.logger.error(`Failed to register agent builder: ${err.message}`);
        });
    }

    let continuousKiOnboardingWorkflowService: ContinuousKiOnboardingWorkflowService | undefined;
    let syncWorkflowService: SyncWorkflowService | undefined;
    let cleanupWorkflowService: CleanupWorkflowService | undefined;
    let significantEventsScheduledWorkflowsService:
      | SignificantEventsScheduledWorkflowsService
      | undefined;

    if (plugins.workflowsManagement && streamsKIsOnboardingClient) {
      continuousKiOnboardingWorkflowService = createContinuousKiOnboardingWorkflowService({
        logger: this.logger,
        managementApi: plugins.workflowsManagement.management,
        streamsKIsOnboardingClient,
      });
    }

    if (plugins.workflowsManagement) {
      syncWorkflowService = createSyncWorkflowService({
        logger: this.logger,
        managementApi: plugins.workflowsManagement.management,
      });
    }

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    );

    // Custom event-driven triggers users can subscribe to from their own workflows.
    registerSignificantEventsWorkflowTriggers(plugins.workflowsExtensions);

    if (plugins.workflowsManagement && plugins.workflowsExtensions) {
      const getManagedWorkflowsClient = async () => {
        const [, pluginsStart] = await core.getStartServices();
        if (!pluginsStart.workflowsExtensions) {
          throw new Error('Workflows extensions are not available');
        }
        return pluginsStart.workflowsExtensions.initManagedWorkflowsClient(
          SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
        );
      };

      cleanupWorkflowService = createCleanupWorkflowService({
        logger: this.logger,
        managementApi: plugins.workflowsManagement.management,
        getManagedWorkflowsClient,
      });

      significantEventsScheduledWorkflowsService = createSignificantEventsScheduledWorkflowsService(
        {
          logger: this.logger,
          managementApi: plugins.workflowsManagement.management,
          getManagedWorkflowsClient,
        }
      );
    }

    core.pricing.registerProductFeatures(SIGNIFICANT_EVENT_TIERED_FEATURES);
    registerFeatureFlags(core, this.logger, plugins.cloud);

    this.maintenanceService = createSignificantEventsMaintenanceService({
      logger: this.logger,
      server: this.server,
      getScopedClients: this.getScopedClients,
    });

    registerRoutes({
      repository: significantEventsRouteRepository,
      dependencies: {
        server: this.server,
        telemetry: telemetryClient,
        getScopedClients: this.getScopedClients,
        continuousKiOnboardingWorkflowService,
        syncWorkflowService,
        cleanupWorkflowService,
        significantEventsScheduledWorkflowsService,
        workflowClients,
        maintenanceService: this.maintenanceService,
        getSpaceId: async (request: KibanaRequest) => {
          const [, pluginsStart] = await core.getStartServices();
          return pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        },
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });
  }

  public start(core: CoreStart, plugins: SignificantEventsPluginStartDependencies): void {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = this.server.cloud?.isServerlessEnabled ?? false;
      this.server.security = plugins.security;
      this.server.actions = plugins.actions;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.inference = plugins.inference;
      this.server.licensing = plugins.licensing;
      this.server.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
      this.server.spaces = plugins.spaces;
      this.server.workflowsExtensions = plugins.workflowsExtensions;
      this.server.agentBuilder = plugins.agentBuilder;
      this.server.nightshiftInvestigations = plugins.nightshiftInvestigations;

      this.server.relayClient = plugins.actions.getRelayClient();

      // The Elastic Slack connector is in-memory, so it survives neither a restart nor a connect
      // handled by another node. The connection document is namespace-agnostic, so one internal
      // client covers the deployment. Relay config is static at start, so skip the poller when the
      // client is absent rather than ticking a reconcile loop that can never do anything.
      if (this.server.relayClient) {
        const slackAppService = new SlackAppService(this.server);
        const soClient = new SavedObjectsClient(
          core.savedObjects.createInternalRepository([RELAY_APP_CONNECTION_SO_TYPE])
        );

        // `timer(0, …)` makes the first tick the startup restore. `catchError` must stay inside the
        // inner observable — outside, one failed tick would end the loop for the process's lifetime.
        this.subscriptions.push(
          timer(0, SLACK_CONNECTOR_RECONCILE_INTERVAL_MS)
            .pipe(
              exhaustMap(() =>
                from(slackAppService.reconcileConnector(soClient)).pipe(
                  catchError((error: unknown) => {
                    this.logger.warn(
                      `Failed to reconcile the Elastic Slack connector: ${
                        error instanceof Error ? error.message : String(error)
                      }`
                    );
                    return of(undefined);
                  })
                )
              )
            )
            .subscribe()
        );
      }
    }

    // Availability is the same requirement registry that gates requests, so a deployment never gets
    // resources it cannot run. Only the flag and the license change at runtime, so only those feed
    // the stream.
    const isAvailable = () =>
      this.server
        ? isSignificantEventsAvailable({ server: this.server, licensing: plugins.licensing })
        : Promise.resolve(false);
    const available$ = combineLatest([
      core.featureFlags.getBooleanValue$(STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG, false),
      plugins.licensing.license$,
    ]).pipe(switchMap(isAvailable), distinctUntilChanged());

    // The availability observable emits its current value on subscribe. `skip(1)` drops that
    // initial emission so the stream represents *changes* only; the initial install/registration is
    // driven explicitly below. `filter((enabled) => enabled)` then keeps only the off->on
    // transitions, since installation only ever adds resources (a flip back to off is handled by
    // request-time gating).
    const availabilityEnabled$ = available$.pipe(
      skip(1),
      filter((enabled) => enabled)
    );

    // Managed workflows go through a single serialized installer that owns the only `ready()` call,
    // so a runtime flag flip can never close the reconciliation window with a partial set (which
    // would prune the owner's other workflows). Created here so the availability path below reuses
    // the same instance.
    if (plugins.workflowsExtensions) {
      const { workflowsExtensions } = plugins;
      this.managedWorkflowsInstaller = createManagedWorkflowsInstaller({
        getClient: () =>
          workflowsExtensions.initManagedWorkflowsClient(SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER),
        isAvailable,
        logger: this.logger,
      });
    }

    // ES templates and managed workflows are installed only when significant events is available,
    // and (re)installed if the availability flag flips on at runtime. This keeps a deployment fully
    // clean while the feature has never been enabled.
    void this.ensureSignificantEventsInstalled(core, isAvailable).catch((error: unknown) => {
      this.logManagedResourceError('startup', error);
    });

    this.subscriptions.push(
      availabilityEnabled$.subscribe(() => {
        void this.ensureSignificantEventsInstalled(core, isAvailable).catch((error: unknown) => {
          this.logManagedResourceError('availability flag change', error);
        });
      })
    );

    // Editable discovery agents: installed via agents.ensure when significant events is
    // available. skip(1) on availabilityEnabled$ drops the initial emission, so catch up at
    // startup as well. Per-space installs also happen just-in-time from scheduled discovery
    // enablement and manual discovery execute.
    // Pause re-assert runs inside ensureSignificantEventsInstalled after every install.
    if (plugins.agentBuilder && this.server) {
      const agentBuilder = plugins.agentBuilder;
      const availability = createSignificantEventsAvailability({
        server: this.server,
        logger: this.logger,
      });
      void installDiscoveryAgents({ agentBuilder, spaceId: DEFAULT_SPACE_ID, availability }).catch(
        (error: unknown) => {
          this.logManagedResourceError('significant events agents', error);
        }
      );
    }

    if (plugins.agentBuilder && this.server && this.getScopedClients) {
      const agentBuilder = plugins.agentBuilder;
      const telemetry = this.ebtTelemetryService.getClient();

      const memoryToolsOptions = createMemoryToolsOptions({
        getScopedClients: this.getScopedClients,
        server: this.server,
        logger: this.logger,
      });

      // Managed resources (templates + workflows) and agent-builder skills install on independent
      // async paths, so on a runtime flip skills can be advertised a moment before their templates and
      // workflows finish installing. We accept that transient window rather than serializing skills
      // behind the installer: every installer is idempotent and self-heals, request-time gating
      // (assertSignificantEventsAccess) already blocks calls until the feature is truly available, and
      // runtime flips are rare admin actions. On a normal boot with the flag already on there is no
      // window, since installation runs before any request can reach a skill.

      // Core skills (including investigation): registered through the start-phase skills API, gated
      // by the availability flag and (re)registered when the flag flips on.
      registerSignificantEventsSkills({
        agentBuilder,
        telemetry,
        streamsKIsOnboardingClient: this.streamsKIsOnboardingClient,
        maintenanceService: this.maintenanceService,
        memoryToolsOptions,
        logger: this.logger,
        isAvailable,
      })
        .then(({ ensureRegistered }) => {
          const onFlip = () => {
            void ensureRegistered().catch((error: unknown) => {
              this.logSkillsRegistrationError('core', error);
            });
          };
          this.subscriptions.push(availabilityEnabled$.subscribe(onFlip));
          // The availability flag may have flipped between the initial registration inside the
          // registrar and this subscription; `skip(1)` would have dropped that emission, so re-check
          // current state once now. `ensureRegistered` is idempotent, so this is a no-op when
          // nothing changed.
          onFlip();
        })
        .catch((err) => {
          this.logger.error(`Failed to register significant events skills: ${err.message}`);
        });

      // Memory skills: gated by availability; (re)registered when the flag flips on.
      registerStreamsMemoryAgentBuilder({
        agentBuilder,
        memoryToolsOptions,
        logger: this.logger,
        isAvailable,
      })
        .then(({ ensureRegistered }) => {
          const onFlip = () => {
            void ensureRegistered().catch((error: unknown) => {
              this.logSkillsRegistrationError('memory', error);
            });
          };
          this.subscriptions.push(availabilityEnabled$.subscribe(onFlip));
          // Catch up on any flip that landed before this subscription (see the note above).
          onFlip();
        })
        .catch((err) => {
          this.logger.error(`Failed to register significant events memory skills: ${err.message}`);
        });
    }
  }

  /**
   * Installs the significant events managed resources (ES index templates and, when
   * `workflowsExtensions` is present, managed workflows), gated by the
   * `streams.significantEventsAvailable` flag. Safe to call repeatedly: template initialization is
   * an upsert and workflow installs are idempotent, so it doubles as the install-on-flip handler for
   * the availability flag. When the flag is disabled it is a no-op, which keeps the workflow
   * reconciliation window from ever closing with zero installs (that would prune the owner's
   * workflows). Rejects with an aggregate error naming every installer that failed, so the caller
   * can surface a single actionable log line.
   */
  private async ensureSignificantEventsInstalled(
    core: CoreStart,
    isAvailable: () => Promise<boolean>
  ): Promise<void> {
    if (!(await isAvailable())) {
      this.logger.debug(
        'significantEvents: availability flag disabled, skipping managed resource installation'
      );
      return;
    }

    const esClient = core.elasticsearch.client.asInternalUser;

    const installers: Array<{ name: string; run: Promise<void> }> = [
      {
        name: 'significant events templates',
        run: initializeSignificantEventsTemplates({ esClient, logger: this.logger }),
      },
      {
        name: 'knowledge indicators template',
        run: initializeKnowledgeIndicatorsTemplate({ esClient, logger: this.logger }),
      },
    ];

    if (this.managedWorkflowsInstaller) {
      installers.push({ name: 'managed workflows', run: this.managedWorkflowsInstaller.install() });
    }

    const results = await Promise.allSettled(installers.map(({ run }) => run));

    const failures = results.flatMap((result, index) =>
      result.status === 'rejected'
        ? [
            `${installers[index].name} (${
              result.reason instanceof Error ? result.reason.message : String(result.reason)
            })`,
          ]
        : []
    );

    // Always reassert after any install attempt: Promise.allSettled can leave
    // some workflows installed (and enabled) even when others fail.
    await this.reassertPauseAfterWorkflowInstall();

    if (failures.length > 0) {
      throw new Error(failures.join('; '));
    }
  }

  private async reassertPauseAfterWorkflowInstall(): Promise<void> {
    if (!this.maintenanceService) {
      return;
    }
    // Propagate failures: swallowing them lets install succeed while newly
    // installed workflows stay enabled during a paused deployment.
    await this.maintenanceService.reassertPausedWorkflows({
      request: createMaintenanceSystemRequest(),
    });
  }

  private logManagedResourceError(context: string, error: unknown): void {
    this.logger.error(
      `significantEvents: failed to install managed resources (${context}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  private logSkillsRegistrationError(scope: string, error: unknown): void {
    this.logger.error(
      `significantEvents: failed to register ${scope} skills: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  public async stop() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
