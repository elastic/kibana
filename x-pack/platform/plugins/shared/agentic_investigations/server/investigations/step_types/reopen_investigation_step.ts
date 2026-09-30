/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
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

        await getInvestigationStatusService().setStatus(request, input.conversationId, {
          status: 'open',
        });

        const newTitle = conv.title.startsWith(REOPEN_PREFIX)
          ? conv.title
          : `${REOPEN_PREFIX}${conv.title}`;

        await client.update({ id: input.conversationId, title: newTitle });

        return { output: { reopened: true, title: newTitle } };
      } catch (error) {
        throw toStepError(error, 'Failed to reopen investigation');
      }
    },
  });
