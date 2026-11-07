/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { z, lazySchema } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { platformCoreCasesTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { CaseAccessMode, CaseStatuses } from '../../../common/types/domain';
import type { Case } from '../../../common/types/domain';
import {
  getAgentCasesClient,
  toolResult,
  type GetCasesClientWithOptionsFn,
} from '../utils/agent_cases_client';
import { CASES_TOOL_TEXT_INSTRUCTION } from '../utils/tool_instructions';

const ACTIONS = ['close', 'set_visibility', 'change_assignees', 'sync', 'push'] as const;

const ACTION_DESCRIPTION =
  'Required fields per action:\n' +
  '- close: case_id (+ optional close_reason, status_key of a closed status). Closing also closes the linked investigations.\n' +
  '- set_visibility: case_id, visibility ("restricted": only assignees can see the case; "public": everyone with access to Cases).\n' +
  '- change_assignees: case_id, assignees (the full new list). On a restricted case the assignees are the people who can see it.\n' +
  "- sync: case_id. Pulls the external incident's changes and sends the case's, as the case's sync settings say.\n" +
  '- push: case_id. Sends the case to its external incident system (creates or updates the incident).';

const confirmedActionsSchema = lazySchema(() =>
  z.object({
    action: z.enum(ACTIONS).describe(ACTION_DESCRIPTION),
    case_id: z.string().min(1),
    close_reason: z.string().max(100).optional(),
    status_key: z.string().max(50).optional(),
    visibility: z.enum(['restricted', 'public']).optional(),
    assignees: z
      .array(z.object({ uid: z.string() }))
      .max(10)
      .optional(),
  })
);

type ConfirmedActionsParams = z.infer<typeof confirmedActionsSchema>;

/** The words the user confirms. Each states the change and who it affects. */
export const getConfirmationText = (params: ConfirmedActionsParams): string => {
  switch (params.action) {
    case 'close':
      return i18n.translate('xpack.cases.agentBuilder.confirm.close', {
        defaultMessage:
          'Close case {caseId}{reason}? Its linked investigations close too, and their pending proposals are dismissed.',
        values: {
          caseId: params.case_id,
          reason: params.close_reason ? ` as ${params.close_reason}` : '',
        },
      });
    case 'set_visibility':
      return params.visibility === 'restricted'
        ? i18n.translate('xpack.cases.agentBuilder.confirm.restrict', {
            defaultMessage:
              'Restrict case {caseId}? Only its assignees will be able to see it, its attachments, its room, and its linked investigations.',
            values: { caseId: params.case_id },
          })
        : i18n.translate('xpack.cases.agentBuilder.confirm.unrestrict', {
            defaultMessage:
              'Make case {caseId} public? Everyone with access to Cases in this space will be able to see it and its linked investigations.',
            values: { caseId: params.case_id },
          });
    case 'change_assignees':
      return i18n.translate('xpack.cases.agentBuilder.confirm.assignees', {
        defaultMessage:
          'Change the assignees of case {caseId} to {count, plural, =0 {nobody} one {# person} other {# people}} ({people})? On a restricted case, assignees are the people who can see it.',
        values: {
          caseId: params.case_id,
          count: params.assignees?.length ?? 0,
          people: (params.assignees ?? []).map(({ uid }) => uid).join(', '),
        },
      });
    case 'sync':
      return i18n.translate('xpack.cases.agentBuilder.confirm.sync', {
        defaultMessage:
          'Sync case {caseId} with its external incident? Changes are sent outside Elastic.',
        values: { caseId: params.case_id },
      });
    case 'push':
      return i18n.translate('xpack.cases.agentBuilder.confirm.push', {
        defaultMessage:
          'Push case {caseId} to its external incident system? The case is sent outside Elastic.',
        values: { caseId: params.case_id },
      });
  }
};

const update = async (
  client: Awaited<ReturnType<GetCasesClientWithOptionsFn>>,
  theCase: Case,
  changes: Record<string, unknown>
) => {
  const [updated] = await client.cases.bulkUpdate({
    cases: [{ id: theCase.id, version: theCase.version, ...changes }],
  });
  return updated;
};

/**
 * The Cases actions that change who can see a case, send data out of Elastic, or close it. They
 * live in their own tool because Agent Builder asks for confirmation per tool, not per mode: every
 * call here shows the user the change and waits for their yes. Everything else is in `manage`.
 */
export const confirmedActionsTool = (
  getCasesClient: GetCasesClientWithOptionsFn
): BuiltinToolDefinition<typeof confirmedActionsSchema> => ({
  id: platformCoreCasesTools.confirmedActions,
  type: ToolType.builtin,
  description: `Case actions that need the user's confirmation in chat: close a case, restrict or unrestrict it, change the assignees of a restricted case, sync it with its external incident, or push it. The user sees what will change and confirms before it runs. Actions: ${ACTIONS.join(
    ', '
  )}. See \`action\` for required inputs.\n\n${CASES_TOOL_TEXT_INSTRUCTION}`,
  annotations: {
    title: 'Case actions that need confirmation',
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  },
  confirmation: {
    askUser: 'always',
    getConfirmation: ({ toolParams }) => ({
      title: i18n.translate('xpack.cases.agentBuilder.confirm.title', {
        defaultMessage: 'Confirm this change to the case',
      }),
      message: getConfirmationText(toolParams as ConfirmedActionsParams),
      confirm_text: i18n.translate('xpack.cases.agentBuilder.confirm.yes', {
        defaultMessage: 'Confirm change',
      }),
      cancel_text: i18n.translate('xpack.cases.agentBuilder.confirm.no', {
        defaultMessage: 'Cancel',
      }),
      color: 'warning' as const,
    }),
  },
  schema: confirmedActionsSchema,
  tags: ['cases'],
  excludeFromMcp: true,
  handler: async (params, toolContext) => {
    const client = await getAgentCasesClient(getCasesClient, toolContext);
    // Reading first also applies the restricted-case check: a case the user can't see is not found.
    const theCase = await client.cases.get({ id: params.case_id, includeComments: false });

    switch (params.action) {
      case 'close': {
        const updated = await update(client, theCase, {
          status: CaseStatuses.closed,
          ...(params.status_key ? { status_key: params.status_key } : {}),
          ...(params.close_reason ? { closeReason: params.close_reason } : {}),
        });
        return toolResult({ case_id: updated.id, status: updated.status });
      }
      case 'set_visibility': {
        if (!params.visibility) throw Boom.badRequest('visibility is required for set_visibility');
        const updated = await update(client, theCase, {
          access: {
            mode:
              params.visibility === 'restricted'
                ? CaseAccessMode.RESTRICTED
                : CaseAccessMode.DEFAULT,
          },
        });
        return toolResult({ case_id: updated.id, access: updated.access });
      }
      case 'change_assignees': {
        if (!params.assignees) throw Boom.badRequest('assignees is required for change_assignees');
        const updated = await update(client, theCase, { assignees: params.assignees });
        return toolResult({ case_id: updated.id, assignees: updated.assignees });
      }
      case 'sync': {
        const synced = await client.cases.sync({ caseId: theCase.id });
        return toolResult({ case_id: synced.id, external_service: synced.external_service });
      }
      case 'push': {
        if (!theCase.connector || theCase.connector.id === 'none') {
          throw Boom.badRequest(
            `Case ${theCase.id} has no external incident connector to push to.`
          );
        }
        const pushed = await client.cases.push({
          caseId: theCase.id,
          connectorId: theCase.connector.id,
          pushType: 'manual',
        });
        return toolResult({ case_id: pushed.id, external_service: pushed.external_service });
      }
      default: {
        const exhaustive: never = params.action;
        throw new Error(`Unknown action: ${exhaustive}`);
      }
    }
  },
});
