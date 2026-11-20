/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskHost } from '@kbn/task-manager-plugin/server/task_type_module';
import { agentBuilderServerEbtEvents } from '@kbn/agent-builder-common';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { INFERENCE_FEATURES_TASK_PROCESS_SETTINGS_ID } from '@kbn/search-inference-endpoints/server/task_process_settings';
import { createInferenceSettingsSavedObjectType } from '@kbn/search-inference-endpoints/server/saved_objects/inference_settings';
import type { WorkflowStepsContribution } from '@kbn/workflows-extensions/server';
import { DEDUCTIVE_UI_SETTINGS } from '../services/execution/run_agent/deductive/register_deductive_agent';
import { agentBuilderSpaceSettingsType } from '../saved_objects';
import { registerUISettings } from '../ui_settings';
import { registerAgentBuilderProcessWorkflowDefinitions } from '../workflows';
import { registerAgentBuilderWorkflowSteps } from '../workflows/register_workflow_steps';
import { registerConversationWorkflowEventBridge } from '../workflows/triggers/event_bridge';
import { describeAgentBuilderParityGap } from '../run_services/parity';
import { AGENT_BUILDER_RUN_SETTINGS_ID } from '../run_services/run_settings';
import { AGENT_BUILDER_CONTRIBUTIONS_KEY } from './agent_builder_contribution';
import type { AgentBuilderContribution } from './agent_builder_contribution';
import { createAgentBuilderProcessServices } from './create_agent_builder_process_services';

/** The ui settings agent builder registers, which the services read. */
const getAgentBuilderUiSettings = (): Array<Record<string, UiSettingsParams>> => {
  const collected: Array<Record<string, UiSettingsParams>> = [];
  registerUISettings({
    uiSettings: {
      register: (settings: Record<string, UiSettingsParams>) => collected.push(settings),
    } as never,
  });
  return collected;
};

/**
 * The workflow triggers and steps of Agent Builder in the task process of the workflow task types.
 * Listed under `taskTypeContributions['workflow-steps']` in `kibana.jsonc`.
 *
 * The triggers (definitions only) and the `rerank` step, which only needs the scoped Elasticsearch
 * client of the run, are always registered. The steps that run an agent (`ai.agent`) and read and
 * write conversations and attachments (`ai.conversation.*`, `ai.attachment.*`) read the registries
 * that plugins fill in their `setup()` (agents, tools, skills, attachment types, conversation
 * templates). In a process they run on agent builder's own services, built by the function the plugin
 * builds them with and filled by the `agent-builder` contributions of the plugins that register with
 * agent builder in Kibana (`AgentBuilderContribution`).
 *
 * Parity: Kibana sends the ids it registered with each registry and the process compares them with
 * what it registered. When Kibana has an id the process lacks (a plugin that does not contribute yet,
 * or a registration that needs a service only Kibana has), the steps above are declined, with a
 * warning that names the ids. The task fails without executing inside Kibana.
 */
export const contribution: WorkflowStepsContribution = {
  declares: {
    schedulableTypes: [/^agent-builder:run-agent$/],
    savedObjectTypes: [agentBuilderSpaceSettingsType, createInferenceSettingsSavedObjectType()],
    settings: [AGENT_BUILDER_RUN_SETTINGS_ID, INFERENCE_FEATURES_TASK_PROCESS_SETTINGS_ID],
    // `registerAgentBuilderWorkflowSteps` (../workflows/register_workflow_steps.ts) registers all of
    // these when `register` below does not return early (agent builder's run settings are on). Lets
    // `resolvePacksForDefinition` select this pack for a workflow that uses `ai.agent` or reads and
    // writes conversations and attachments, instead of falling back to a full load.
    //
    // `register` above also reads every plugin's `agent-builder` contribution
    // (`host.contributions[AGENT_BUILDER_CONTRIBUTIONS_KEY]`) to build the process's own agent, tool
    // and skill registries with parity to what Kibana registered: naming the whole `agent-builder`
    // contribution key here (not a specific service) selects every one of those packs too, so `ai.agent`
    // is never declined for a registration this pack alone does not carry.
    requires: ['agent-builder'],
    stepTypes: [
      'ai.agent',
      'ai.attachment.add',
      'ai.attachment.delete',
      'ai.attachment.list',
      'ai.attachment.read',
      'ai.attachment.update',
      'ai.conversation.add_event',
      'ai.conversation.add_user_message',
      'ai.conversation.create',
      'ai.conversation.metadata.patch',
      'ai.conversation.metadata.read',
    ],
    uiSettings: getAgentBuilderUiSettings(),
    // The global settings of the Deductive agent (registered when Kibana's config opts in).
    globalUiSettings: [DEDUCTIVE_UI_SETTINGS],
    analyticsEventTypes: agentBuilderServerEbtEvents,
  },
  register: async (registry, context) => {
    registerAgentBuilderProcessWorkflowDefinitions(registry);

    const { services, registerRunCheck } = context;
    const host = context.host as TaskHost;
    // Without the services of the engine (a unit test of a contribution that does not use them) or the
    // settings of Kibana's agent builder (it is disabled there), the steps that need them are not served.
    if (!services || !context.settings[AGENT_BUILDER_RUN_SETTINGS_ID]) return;

    const contributions = (host.contributions?.[AGENT_BUILDER_CONTRIBUTIONS_KEY] ??
      []) as AgentBuilderContribution[];
    const processServices = await createAgentBuilderProcessServices({
      host,
      logger: context.logger,
      settings: context.settings,
      contributions,
      context: {
        host,
        logger: context.logger,
        isServerless: context.isServerless,
        kibanaVersion: context.kibanaVersion,
        settings: context.settings,
      },
      getActionsClientWithRequest: services.getActionsClientWithRequest,
      actions: services.getService('actions'),
      spaces: services.getService('spaces'),
      getService: services.getService,
      emitEvent: services.emitEvent,
      registerRunCompletion: services.registerRunCompletion,
      getWorkflowsManagement: () => services.getService('workflows.management'),
    });
    if (!processServices) return;
    services.registerService('agentBuilder', processServices.start);
    services.registerService('searchInferenceEndpoints', processServices.searchInferenceEndpoints);
    // The same task handler `ServiceManager.startServices` builds for Kibana's own
    // `agent-builder:run-agent` task type: `run_agent.task.ts` reads it from this registry when the
    // module runs in a process, instead of the `host.plugins.agentBuilder.taskHandler` shortcut
    // Kibana sends it directly.
    services.registerService(
      'agentBuilder.taskHandler',
      processServices.getInternalServices().taskHandler
    );

    // The steps that read agent builder's registries, so that the guard can name them.
    const stepIds = new Set<string>();
    registerAgentBuilderWorkflowSteps(
      {
        registerStepDefinition: (definition) => {
          stepIds.add((definition as { id: string }).id);
          registry.registerStepDefinition(definition);
        },
      },
      {
        serviceManager: processServices.serviceManager,
        getCoreStart: async () => ({ savedObjects: host.savedObjects } as never),
        getSpaces: async () => processServices.spaces,
      }
    );

    // The conversation triggers: a run emits them with the engine's runtime, and finishes before it answers.
    const completeConversationEvents = registerConversationWorkflowEventBridge(
      processServices.conversationEventBus,
      {
        getClient: async (request: never) => ({
          emitEvent: (triggerId: string, payload: Record<string, unknown>) => {
            return services.emitEvent({ triggerId, payload, request });
          },
        }),
      } as never,
      context.logger,
      processServices.conversationUpdatedOptIns
    );
    services.registerRunCompletion(completeConversationEvents);

    let gap: string | undefined | null = null;
    const getGap = () => {
      if (gap === null) {
        gap = describeAgentBuilderParityGap(host.parity, processServices.registrations.ids());
        if (gap) {
          context.logger.warn(
            `This task process registered something other than Kibana did with agent builder, so the workflows that run an agent or use conversations and attachments are declined: the process ${gap}`
          );
        }
      }
      return gap;
    };
    services.registerService('agentBuilder.parity', getGap);
    registerRunCheck?.((step) => {
      if (stepIds.has(step.type)) {
        const missing = getGap();
        if (missing)
          return `the agent builder registrations of the process differ from Kibana's: the process ${missing}`;
      }
      return undefined;
    });
  },
};
