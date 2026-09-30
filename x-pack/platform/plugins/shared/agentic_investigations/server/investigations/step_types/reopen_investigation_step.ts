/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { reopenInvestigationStepCommonDefinition } from '../../../common/investigations/step_types/reopen_investigation_step';
import { parseStepInput } from '../../impact/step_types/parse_step_input';
import { toStepError } from './to_step_error';
import type { InvestigationStatusService } from '../services/investigation_status_service';

const REOPEN_PREFIX = '[Reopen] ';

/** Reopens a closed investigation and prepends "[Reopen] " to its title. */
export const getReopenInvestigationStepDefinition = ({
  getInvestigationStatusService,
  getConversationClient,
}: {
  getInvestigationStatusService: () => InvestigationStatusService;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}) =>
  createServerStepDefinition({
    ...reopenInvestigationStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(
          reopenInvestigationStepCommonDefinition.inputSchema,
          context.input
        );
        const request = context.contextManager.getFakeRequest();
        const client = await getConversationClient(request);
        const conv = await client.get(input.conversationId);

        if (conv.metadata?.['status'] !== 'closed') {
          return { output: { reopened: false, title: conv.title } };
        }

        // Title before status: the investigation stays closed until the last write,
        // so a retry after any partial failure still takes this branch and reports
        // `reopened: true`, which is what keeps the caller from auto-approving.
        const newTitle = conv.title.startsWith(REOPEN_PREFIX)
          ? conv.title
          : `${REOPEN_PREFIX}${conv.title}`;
        if (newTitle !== conv.title) {
          // Status writes need converse access but renames need ownership, so check
          // before either write rather than reopen and then fail on the title.
          if (!conv.permissions.rename) {
            throw new ExecutionError({
              type: 'PermissionError',
              message: `Not allowed to rename investigation ${input.conversationId}, so it cannot be reopened`,
            });
          }
          await client.update({ id: input.conversationId, title: newTitle });
        }

        await getInvestigationStatusService().setStatus(request, input.conversationId, {
          status: 'open',
        });

        return { output: { reopened: true, title: newTitle } };
      } catch (error) {
        throw toStepError(error, 'Failed to reopen investigation');
      }
    },
  });
