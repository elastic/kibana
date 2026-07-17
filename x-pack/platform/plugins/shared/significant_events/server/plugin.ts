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
import { registerRoutes } from '@kbn/server-route-repository';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { RulesClientCreateOptions } from '@kbn/alerting-plugin/server';
import { distinctUntilChanged, filter, skip } from 'rxjs';
import type { Subscription } from 'rxjs';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import type { SignificantEventsConfig } from '../common/config';
import { RelayClient } from './lib/slack_app/relay_client';
import { getRelayAppConnectionSavedObjectType } from './lib/slack_app/saved_object';
import {
  createManagedWorkflowsInstaller,
  type ManagedWorkflowsInstaller,
} from './lib/workflows/setup/managed_workflows_installer';
import { registerFeatureFlags } from './feature_flags';
import { registerRules } from './lib/significant_events/rules/register_rules';
import { getSignificantEventsTuningConfig } from './lib/significant_events/helpers/get_significant_events_tuning_config';

import { createSignificantEventsAlertingContextResolver } from './lib/significant_events/alerting/significant_events_alerting_context';
import type { SignificantEventsAlertingContext } from './lib/significant_events/alerting/significant_events_alerting_context';
import { EbtTelemetryService } from './lib/telemetry';
import { significantEventsRouteRepository } from './routes';
import type { GetScopedClients, RouteHandlerScopedClients } from './routes/types';
import type {
  SignificantEventsPluginSetupDependencies,
  SignificantEventsPluginStartDependencies,
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
  createSignificantEventsScheduledWorkflowsService,
  type SignificantEventsScheduledWorkflowsService,
} from './lib/workflows/significant_events_scheduled_workflows';
import { createWorkflowClients } from './lib/workflows/create_workflow_clients';
import { installInvestigationAgent } from './memory_and_investigation/lib/investigation/install_investigation_agent';
import { registerInvestigationAgentType } from './memory_and_investigation/agents/investigation';
import { SIGNIFICANT_EVENT_TIERED_FEATURES } from '../common/constants';
import { STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG } from '../common/feature_flags';
import { isSignificantEventsAvailable } from './lib/feature_flags/is_significant_events_available';
import type { SignificantEventsKIsOnboardingClient } from './lib/workflows/onboarding_workflow_client';

const SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER = 'significant_events';

export interface SignificantEventsPluginSetup {
  registerKnowledgeIndicatorClientProvider(
    provider: (request: KibanaRequest) => Promise<KnowledgeIndicatorClient>
  ): void;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SignificantEventsPluginStart {}

export class SignificantEventsPlugin
  implements
    Plugin<
      SignificantEventsPluginSetup,
      SignificantEventsPluginStart,
      SignificantEventsPluginSetupDependencies,
      SignificantEventsPluginStartDependencies
    >
{
  public config: SignificantEventsConfig;
  public logger: Logger;
  public server?: StreamsServer;
  private isDev: boolean;
  private ebtTelemetryService = new EbtTelemetryService();
  private getScopedClients?: GetScopedClients;
  private subscriptions: Subscription[] = [];
  private kiProvider?: (request: KibanaRequest) => Promise<KnowledgeIndicatorClient>;
  private kibanaVersion: string;
  private streamsKIsOnboardingClient?: SignificantEventsKIsOnboardingClient;
  private managedWorkflowsInstaller?: ManagedWorkflowsInstaller;

  constructor(context: PluginInitializerContext<SignificantEventsConfig>) {
    this.isDev = context.env.mode.dev;
    this.config = context.config.get();
    this.logger = context.logger.get();
    this.kibanaVersion = context.env.packageInfo.version;
  }

  public setup(
    core: CoreSetup<SignificantEventsPluginStartDependencies>,
    plugins: SignificantEventsPluginSetupDependencies
  ): SignificantEventsPluginSetup {
    this.server = {
      logger: this.logger,
      workflowsManagement: plugins.workflowsManagement,
      cloud: plugins.cloud,
      kibanaVersion: this.kibanaVersion,
    } as StreamsServer;
    this.server.workflowsManagement = plugins.workflowsManagement;

    core.savedObjects.registerType(getRelayAppConnectionSavedObjectType());

    this.ebtTelemetryService.setup(core.analytics);

    registerRules({ plugins, logger: this.logger.get('rules') });
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

      const scopedSoClient = coreStart.savedObjects.getScopedClient(request);
      const uiSettingsClient = coreStart.uiSettings.asScopedToClient(scopedSoClient);
      const globalUiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(scopedSoClient);

      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
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
      });

      const getAlertingRulesClient = async () =>
        pluginsStart.alerting.getRulesClientWithRequestInSpace(
          request,
          DEFAULT_SPACE_ID,
          rulesClientOptions
        );

      const getAlertingV2RulesClient = async () =>
        pluginsStart.alertingVTwo
          ? pluginsStart.alertingVTwo.getRulesClientWithRequestInSpace(request, DEFAULT_SPACE_ID)
          : undefined;

      const resolveSignificantEventsAlertingContext =
        createSignificantEventsAlertingContextResolver({
          uiSettingsClient,
          getAlertingRulesClient,
          getAlertingV2RulesClient,
          logger: this.logger,
        });

      const createKnowledgeIndicatorClient = (context: SignificantEventsAlertingContext) =>
        knowledgeIndicatorService.getClient({
          esClient: scopedClusterClient.asInternalUser,
          soClient,
          context,
          config: tuningConfig,
        });

      let kiClientPromise: ReturnType<typeof createKnowledgeIndicatorClient> | undefined;
      const getKnowledgeIndicatorClient: () => Promise<KnowledgeIndicatorClient> = this.kiProvider
        ? () => this.kiProvider!(request)
        : () => {
            kiClientPromise ??= (async () =>
              createKnowledgeIndicatorClient(await resolveSignificantEventsAlertingContext()))();
            return kiClientPromise;
          };

      const license = await licensing.getLicense();
      const isSecurityEnabled = license.getFeature('security').isEnabled;

      return {
        scopedClusterClient,
        soClient,
        attachmentClient,
        getSignificantEventsAlertingContext: resolveSignificantEventsAlertingContext,
        getKnowledgeIndicatorClient,
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
      registerInvestigationAgentType(plugins.agentBuilder);
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

    plugins.workflowsExtensions?.registerManagedWorkflowOwner(
      SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
    );

    if (plugins.workflowsManagement && plugins.workflowsExtensions) {
      significantEventsScheduledWorkflowsService = createSignificantEventsScheduledWorkflowsService(
        {
          logger: this.logger,
          managementApi: plugins.workflowsManagement.management,
          getManagedWorkflowsClient: async () => {
            const [, pluginsStart] = await core.getStartServices();
            if (!pluginsStart.workflowsExtensions) {
              throw new Error('Workflows extensions are not available');
            }
            return pluginsStart.workflowsExtensions.initManagedWorkflowsClient(
              SIGNIFICANT_EVENTS_MANAGED_WORKFLOW_OWNER
            );
          },
        }
      );
    }

    core.pricing.registerProductFeatures(SIGNIFICANT_EVENT_TIERED_FEATURES);
    registerFeatureFlags(core, this.logger, {
      isAlertingV2PluginAvailable: 'alertingVTwo' in plugins,
    });

    registerRoutes({
      repository: significantEventsRouteRepository,
      dependencies: {
        server: this.server,
        telemetry: telemetryClient,
        getScopedClients: this.getScopedClients,
        continuousKiOnboardingWorkflowService,
        significantEventsScheduledWorkflowsService,
        workflowClients,
        getSpaceId: async (request: KibanaRequest) => {
          const [, pluginsStart] = await core.getStartServices();
          return pluginsStart.spaces?.spacesService.getSpaceId(request) ?? DEFAULT_SPACE_ID;
        },
      },
      core,
      logger: this.logger,
      runDevModeChecks: this.isDev,
    });

    return {
      registerKnowledgeIndicatorClientProvider: (provider) => {
        this.kiProvider = provider;
      },
    };
  }

  public start(
    core: CoreStart,
    plugins: SignificantEventsPluginStartDependencies
  ): SignificantEventsPluginStart {
    if (this.server) {
      this.server.core = core;
      this.server.isServerless = core.elasticsearch.getCapabilities().serverless;
      this.server.security = plugins.security;
      this.server.actions = plugins.actions;
      this.server.encryptedSavedObjects = plugins.encryptedSavedObjects;
      this.server.inference = plugins.inference;
      this.server.licensing = plugins.licensing;
      this.server.taskManager = plugins.taskManager;
      this.server.searchInferenceEndpoints = plugins.searchInferenceEndpoints;
      this.server.spaces = plugins.spaces;
      this.server.workflowsExtensions = plugins.workflowsExtensions;
      this.server.agentBuilder = plugins.agentBuilder;

      // Built once here rather than per-request: reads TLS cert/key/CA files from disk
      // and keeps its own connection pool (see RelayClient's class doc).
      const relayService = this.config.relayService;
      if (relayService) {
        this.server.relayClient = new RelayClient({
          baseUrl: relayService.url,
          tls: relayService.tls,
          logger: this.logger.get('relay-client'),
        });
      }
    }

    // The availability flag observable emits its current value on subscribe. `skip(1)` drops that
    // initial emission so the stream represents *changes* only; the initial install/registration is
    // driven explicitly below. `filter((enabled) => enabled)` then keeps only the off->on
    // transitions, since installation only ever adds resources (a flip back to off is handled by
    // request-time gating).
    const availabilityEnabled$ = core.featureFlags
      .getBooleanValue$(STREAMS_SIGNIFICANT_EVENTS_AVAILABLE_FLAG, false)
      .pipe(
        distinctUntilChanged(),
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
        isAvailable: () => isSignificantEventsAvailable(core.featureFlags),
        logger: this.logger,
      });
    }

    // ES templates and managed workflows are installed only when significant events is available,
    // and (re)installed if the availability flag flips on at runtime. This keeps a deployment fully
    // clean while the feature has never been enabled.
    void this.ensureSignificantEventsInstalled(core).catch((error: unknown) => {
      this.logManagedResourceError('startup', error);
    });

    this.subscriptions.push(
      availabilityEnabled$.subscribe(() => {
        void this.ensureSignificantEventsInstalled(core).catch((error: unknown) => {
          this.logManagedResourceError('availability flag change', error);
        });
      })
    );

    // Editable investigation agent: installed via agents.ensure when significant events is
    // available. skip(1) on availabilityEnabled$ drops the initial emission, so catch up at
    // startup as well. Per-space installs also happen just-in-time from triggerInvestigationWorkflow.
    if (plugins.agentBuilder) {
      const agentBuilder = plugins.agentBuilder;
      const installAgent = () =>
        installInvestigationAgent({ agentBuilder, spaceId: DEFAULT_SPACE_ID }).catch(
          (error: unknown) => {
            this.logManagedResourceError('investigation agent', error);
          }
        );

      void (async () => {
        if (await isSignificantEventsAvailable(core.featureFlags)) {
          await installAgent();
        }
      })();

      this.subscriptions.push(availabilityEnabled$.subscribe(() => void installAgent()));
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
        memoryToolsOptions,
        logger: this.logger,
        isAvailable: () => isSignificantEventsAvailable(core.featureFlags),
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
        isAvailable: () => isSignificantEventsAvailable(core.featureFlags),
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

    return {};
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
  private async ensureSignificantEventsInstalled(core: CoreStart): Promise<void> {
    if (!(await isSignificantEventsAvailable(core.featureFlags))) {
      this.logger.debug(
        'significant_events: availability flag disabled, skipping managed resource installation'
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

    if (failures.length > 0) {
      throw new Error(failures.join('; '));
    }
  }

  private logManagedResourceError(context: string, error: unknown): void {
    this.logger.error(
      `significant_events: failed to install managed resources (${context}): ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  private logSkillsRegistrationError(scope: string, error: unknown): void {
    this.logger.error(
      `significant_events: failed to register ${scope} skills: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  public async stop() {
    this.subscriptions.forEach((s) => s.unsubscribe());
  }
}
