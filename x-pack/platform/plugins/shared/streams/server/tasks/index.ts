/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { LicensingTasksStart } from '@kbn/licensing-plugin/server/tasks';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { AlertingTasksStart } from '@kbn/alerting-plugin/server/tasks';
import type {
  FieldsMetadataTasksSetup,
  FieldsMetadataTasksStart,
} from '@kbn/fields-metadata-plugin/server/tasks';
import type { SpacesTasksStart } from '@kbn/spaces-plugin/server/tasks';
import { registerFieldsMetadataExtractors } from '../register_fields_metadata_extractors';
import { registerStreamsAgentBuilder } from '../agent_builder/register';
import type { GetAgentBuilderScopedClients } from '../agent_builder/types';
import { AttachmentService } from '../lib/streams/attachments/attachment_service';
import { StreamsService } from '../lib/streams/service';
import type { StreamsPluginStartDependencies } from '../types';

interface TasksSetupDeps {
  agentBuilder: AgentBuilderPluginSetup;
  fieldsMetadata: FieldsMetadataTasksSetup;
}

interface TasksStartDeps {
  licensing: LicensingTasksStart;
  alerting: AlertingTasksStart;
  fieldsMetadata: FieldsMetadataTasksStart;
  spaces?: SpacesTasksStart;
}

/** Fails with a clear message naming what a task pod does not have. */
const unavailable = <T extends object>(what: string): T =>
  new Proxy({} as T, {
    get: (_target, prop) => () => {
      throw new Error(`${what} (${String(prop)})`);
    },
  });

/**
 * The agent builder side of Streams for a task pod: the Streams tools and skill, built from the same
 * registration the plugin runs in Kibana, over the scoped clients the tools use.
 *
 * Not available in a pod: the alerting rules client (a stream's rule attachments cannot be read or
 * changed; asking for the client fails with the alerting contract's message, which a tool reports
 * when it touches rules) and the Fleet integration fields of the fields metadata client. The
 * space-solution check that hides the tools reads the space document through the Spaces tasks
 * contract.
 */
class StreamsTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps, TasksStartDeps> {
  private readonly isDev: boolean;
  private readonly isServerless: boolean;

  constructor(private readonly context: PluginInitializerContext) {
    this.isDev = context.env.mode.dev;
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: CoreTasksSetup<TasksStartDeps>, { agentBuilder, fieldsMetadata }: TasksSetupDeps) {
    const logger = this.context.logger.get();
    // The services only read `getStartServices`, which has what they use in a pod.
    const coreSetup = core as unknown as CoreSetup<StreamsPluginStartDependencies>;
    const attachmentService = new AttachmentService(coreSetup, logger);
    const streamsService = new StreamsService(coreSetup, logger, this.isDev, this.isServerless);

    const getScopedClients: GetAgentBuilderScopedClients = async ({ request }) => {
      const [coreStart, { licensing, alerting, fieldsMetadata: fieldsMetadataStart }] =
        await core.getStartServices();

      const soClient = coreStart.savedObjects.getScopedClient(request);
      const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
      const scopedClusterClient = coreStart.elasticsearch.client.asScoped(request);
      const rulesClient = await alerting
        .getRulesClientWithRequest(request)
        .catch((error: Error) => unavailable<RulesClient>(error.message));
      const attachmentClient = await attachmentService.getClient({ soClient, rulesClient });
      const license = await licensing.getLicense();
      const streamsClient = await streamsService.getClient({
        attachmentClient,
        esClient: scopedClusterClient.asCurrentUser,
        esClientAsInternalUser: coreStart.elasticsearch.client.asInternalUser,
        uiSettingsClient,
        isSecurityEnabled: license.getFeature('security').isEnabled,
      });

      return {
        scopedClusterClient,
        streamsClient,
        attachmentClient,
        uiSettingsClient,
        fieldsMetadataClient: await fieldsMetadataStart.getClient(request),
      };
    };

    registerFieldsMetadataExtractors({ fieldsMetadata, logger });

    registerStreamsAgentBuilder({
      agentBuilder,
      getScopedClients,
      server: { isServerless: this.isServerless },
      logger,
      core: coreSetup,
    });
  }

  start(_core: CoreTasksStart) {}
}

export const plugin = async (context: PluginInitializerContext) => new StreamsTasksPlugin(context);
