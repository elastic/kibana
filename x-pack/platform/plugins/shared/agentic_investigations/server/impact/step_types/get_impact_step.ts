/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ConversationPublicClient } from '@kbn/agent-builder-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getImpactStepCommonDefinition } from '../../../common/impact/step_types/get_impact_step';
import { parseStepInput } from './parse_step_input';
import type { ImpactService } from '../services/impact_service';
import type { InvestigationsPrivilegesChecker } from '../../investigations/services/check_investigations_privileges';
import { filterReadableConversationIds } from '../../investigations/services/readable_conversation_ids';
import { ImpactNotFoundError } from '../services/errors';
import { toStepError } from './to_step_error';

/**
 * Reads impact for a conversation and fails the step when none has been attached, or when the
 * workflow's identity cannot read the conversation (reported the same way, as not found).
 */
export const getGetImpactStepDefinition = ({
  getImpactService,
  privileges,
  getConversationClient,
}: {
  getImpactService: () => ImpactService;
  privileges: InvestigationsPrivilegesChecker;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}) =>
  createServerStepDefinition({
    ...getImpactStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(getImpactStepCommonDefinition.inputSchema, context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        const request = context.contextManager.getFakeRequest();
        await privileges.assertCanRead(request);
        const readable = await filterReadableConversationIds(await getConversationClient(request), [
          input.conversationId,
        ]);
        if (readable.length === 0) {
          throw new ImpactNotFoundError(input.conversationId);
        }

        const impact = await getImpactService().getByConversationId(input.conversationId, spaceId);

        return {
          output: {
            id: impact.id,
            entities: impact.entities ?? [],
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read impact');
      }
    },
  });
