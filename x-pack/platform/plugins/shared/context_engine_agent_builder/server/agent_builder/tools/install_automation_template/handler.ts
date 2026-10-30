/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import type { KibanaRequest } from '@kbn/core-http-server';
import {
  installAutomationTemplate,
  renderAutomationTemplate,
  type InstallAutomationTemplateDependencies,
  type InstallAutomationTemplateParams,
  type InstallAutomationTemplateResult,
} from '../../../automation_templates/install_automation_template';
import {
  resolveAiIndexIdFromAttachments,
  syncAttachmentsToSavedWorkflow,
} from '../save_automation/handler';

const aiIndexIdFromAttachments = (attachments: AttachmentStateManager): string => {
  try {
    return resolveAiIndexIdFromAttachments(
      attachments.getAll().flatMap((attachment) => {
        const latestVersion = getLatestVersion(attachment);
        if (!latestVersion?.data || typeof latestVersion.data !== 'object') {
          return [];
        }

        return [{ type: attachment.type, data: latestVersion.data as { id?: string } }];
      })
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No ai_index attachment')) {
      throw new Error(
        'No ai_index attachment found in this conversation. Attach the AI index first. This tool does not take an aiIndexId.'
      );
    }
    throw error;
  }
};

/**
 * Installs a template on the AI index attached to the conversation, then points the
 * conversation's workflow attachment at the saved workflow, as saving any automation does.
 */
export const installAutomationTemplateHandler = async ({
  params,
  request,
  spaceId,
  attachments,
  ...deps
}: InstallAutomationTemplateDependencies & {
  params: InstallAutomationTemplateParams;
  request: KibanaRequest;
  spaceId: string;
  attachments: AttachmentStateManager;
}): Promise<InstallAutomationTemplateResult> => {
  const aiIndexId = aiIndexIdFromAttachments(attachments);
  const result = await installAutomationTemplate({
    aiIndexId,
    params,
    request,
    spaceId,
    ...deps,
  });

  await syncAttachmentsToSavedWorkflow({
    source: { yaml: renderAutomationTemplate(params, aiIndexId) },
    workflowId: result.workflowId,
    attachments,
    logger: deps.logger,
  });

  return result;
};
