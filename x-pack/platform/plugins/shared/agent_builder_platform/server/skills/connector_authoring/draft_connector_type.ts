/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { PluginStartContract as TriggersActionsUiStart } from '@kbn/triggers-actions-ui-plugin/server';
import { CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE } from '../../../common/attachments';

const draftConnectorTypeSchema = lazySchema(() =>
  z.object({
    documentation_url: z.url().max(2048).describe('Public API documentation URL for the service.'),
  })
);

export const createDraftConnectorTypeTool = ({
  getTriggersActionsUiStart,
}: {
  getTriggersActionsUiStart: () => Promise<TriggersActionsUiStart>;
}): BuiltinSkillBoundedTool<typeof draftConnectorTypeSchema> => ({
  id: 'draft_connector_type',
  type: ToolType.builtin,
  description:
    'Ask for approval in a confirmation card, then generate a validated connector type draft from a public API documentation URL and show a card that opens the prefilled Build a connector form. Use this when no existing connector type fits. The caller needs superuser access. This does not register the type or create a connector instance.',
  schema: draftConnectorTypeSchema,
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.agentBuilderPlatform.connectorAuthoring.draft.confirmTitle', {
        defaultMessage: 'Draft a new connector type?',
      }),
      message: i18n.translate(
        'xpack.agentBuilderPlatform.connectorAuthoring.draft.confirmMessage',
        {
          defaultMessage: 'Create a draft from {documentationUrl} for review in Build a connector?',
          values: { documentationUrl: toolParams.documentation_url },
        }
      ),
      confirm_text: i18n.translate(
        'xpack.agentBuilderPlatform.connectorAuthoring.draft.confirmButton',
        { defaultMessage: 'Generate draft' }
      ),
      cancel_text: i18n.translate(
        'xpack.agentBuilderPlatform.connectorAuthoring.draft.cancelButton',
        {
          defaultMessage: 'Cancel',
        }
      ),
    }),
  },
  handler: async ({ documentation_url: documentationUrl }, context) => {
    try {
      const triggersActionsUi = await getTriggersActionsUiStart();
      const { draft, logoUrl } = await triggersActionsUi.generateConnectorTypeDraft(
        documentationUrl,
        context.request
      );
      const attachment = await context.attachments.add(
        {
          type: CONNECTOR_TYPE_DRAFT_ATTACHMENT_TYPE,
          data: {
            draft,
            documentation_url: documentationUrl,
            ...(logoUrl ? { logo_url: logoUrl } : {}),
          },
          description: `Review ${draft.displayName} connector type draft`,
        },
        'agent'
      );
      return {
        results: [
          {
            tool_result_id: getToolResultId(),
            type: ToolResultType.other,
            data: {
              attachment_id: attachment.id,
              connector_type_name: draft.displayName,
            },
          },
        ],
      };
    } catch (error) {
      return {
        results: [
          createErrorResult({
            message: `Could not draft connector type: ${(error as Error).message}`,
          }),
        ],
      };
    }
  },
});
