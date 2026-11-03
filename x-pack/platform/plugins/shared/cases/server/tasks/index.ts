/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  Logger,
  PluginConfigDescriptor,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import type { WorkflowsExtensionsTasksSetup } from '@kbn/workflows-extensions/server/tasks';
import { UnifiedAttachmentTypeRegistry } from '../attachment_framework/unified_attachment_registry';
import { registerCasesAgentBuilderTools } from '../agent_builder';
import { ConfigSchema, type ConfigType } from '../config';
import { registerInternalAttachments } from '../internal_attachments';
import { registerCaseWorkflowSteps } from '../workflows';
import { registerCaseWorkflowTriggers } from '../workflows/triggers';

export const config: PluginConfigDescriptor<ConfigType> = { schema: ConfigSchema };

interface TasksSetupDeps {
  workflowsExtensions: WorkflowsExtensionsTasksSetup;
  agentBuilder?: Parameters<typeof registerCasesAgentBuilderTools>[0];
}

const UNAVAILABLE_IN_POD =
  'The Cases client is not available in a task pod: it needs the Lens, Files and Rule Registry ' +
  'services, which run only in Kibana. Run this step or tool in Kibana.';

/** What a Cases step or tool calls for its client; it fails with a message naming what is missing. */
const getCasesClientInPod = async (): Promise<never> => {
  throw new Error(UNAVAILABLE_IN_POD);
};

/**
 * The Cases tools and skills are listed as unavailable so that an agent running in a pod is not
 * offered what would fail on every call.
 */
const unavailableInPod = {
  cacheMode: 'space' as const,
  handler: async () => ({ status: 'unavailable' as const, reason: UNAVAILABLE_IN_POD }),
};

/**
 * The workflows and agent builder side of Cases for a task pod, registered by the same functions as
 * the plugin's `server` entry. The workflow triggers, the agent builder attachment types and the
 * step and tool definitions are the real ones. A pod has no Lens, Files, Rule Registry or Notifications
 * services, which the Cases client needs, so the steps fail with a message naming what is missing and
 * the tools and skills are unavailable to agents. The `.cases` connector type is not registered: it
 * needs the same client, so Task Manager runs it in Kibana (the pod does not know the task type).
 *
 * In Kibana the registries are the plugins' own and ignore a second registration, which makes this
 * entry harmless when both entries run in one process.
 */
class CasesTasksPlugin implements TasksPlugin<void, void, TasksSetupDeps> {
  private readonly config: ConfigType;
  private readonly logger: Logger;

  constructor(context: PluginInitializerContext<ConfigType>) {
    this.config = context.config.get();
    this.logger = context.logger.get();
  }

  setup(core: CoreTasksSetup, { workflowsExtensions, agentBuilder }: TasksSetupDeps) {
    const attachmentsEnabled = this.config.attachments?.enabled === true;
    const templatesEnabled = this.config.templates?.enabled === true;
    const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();
    registerInternalAttachments(unifiedAttachmentTypeRegistry);

    registerCaseWorkflowSteps(
      workflowsExtensions,
      getCasesClientInPod,
      unifiedAttachmentTypeRegistry,
      attachmentsEnabled,
      templatesEnabled,
      () => core.getStartServices()
    );
    registerCaseWorkflowTriggers(workflowsExtensions);

    if (agentBuilder) {
      registerCasesAgentBuilderTools(
        agentBuilder,
        getCasesClientInPod,
        // The tools only call `getStartServices` on it, which a tasks entry's Core has too.
        core as never,
        unifiedAttachmentTypeRegistry,
        {
          analyticsV2Enabled: this.config.analyticsV2.enabled,
          attachmentsEnabled,
          templatesEnabled,
        },
        this.logger,
        unavailableInPod
      );
    }
  }

  start() {}
}

export const plugin = async (context: PluginInitializerContext<ConfigType>) =>
  new CasesTasksPlugin(context);
