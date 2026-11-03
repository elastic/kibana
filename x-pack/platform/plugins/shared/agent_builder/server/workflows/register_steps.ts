/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginSetup } from '@kbn/workflows-extensions/server';
import type { ServiceManager } from '../services/create_services';
import { createAttachmentPublicClient } from '../services/attachments/attachment_public_client';
import { getRunAgentStepDefinition, rerankStepDefinition } from '../step_types';
import { registerAttachmentWorkflowSteps, registerConversationWorkflowSteps } from '.';

type StartServices = () => Promise<[CoreStart, { spaces?: unknown }, unknown]>;

/**
 * Every workflow step and trigger Agent Builder contributes. Kibana's plugin and the task runtime's
 * entry both call it, so a workflow runs the same steps wherever the workflows engine runs.
 */
export const registerAgentBuilderWorkflowSteps = ({
  workflowsExtensions,
  serviceManager,
  getStartServices,
}: {
  workflowsExtensions: Pick<
    WorkflowsExtensionsServerPluginSetup,
    'registerStepDefinition' | 'registerTriggerDefinition'
  >;
  serviceManager: ServiceManager;
  getStartServices: StartServices;
}) => {
  const target = workflowsExtensions as WorkflowsExtensionsServerPluginSetup;

  target.registerStepDefinition(getRunAgentStepDefinition(serviceManager));
  target.registerStepDefinition(rerankStepDefinition);

  registerConversationWorkflowSteps(target, {
    getConversationClient: async (request) => {
      const services = serviceManager.internalStart;
      if (!services) {
        throw new Error('Conversation service not available — plugin has not started');
      }
      return services.conversations.getScopedClient({ request });
    },
    getAgentRegistry: async (request) => {
      const services = serviceManager.internalStart;
      if (!services) {
        throw new Error('Agents service not available — plugin has not started');
      }
      return services.agents.getRegistry({ request });
    },
    getExecutionService: () => {
      const services = serviceManager.internalStart;
      if (!services) {
        throw new Error('Execution service not available — plugin has not started');
      }
      return services.execution;
    },
  });

  registerAttachmentWorkflowSteps(target, {
    getAttachmentClient: async (request) => {
      const services = serviceManager.internalStart;
      if (!services) {
        throw new Error('Attachment client not available — plugin has not started');
      }
      const [coreStart, startDeps] = await getStartServices();
      return createAttachmentPublicClient({
        request,
        conversationsService: services.conversations,
        attachmentsService: services.attachments,
        coreStart,
        spaces: startDeps.spaces as never,
        source: 'workflow',
      });
    },
  });
};
