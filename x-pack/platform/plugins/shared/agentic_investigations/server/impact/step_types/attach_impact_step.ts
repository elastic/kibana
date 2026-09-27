/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AttachmentPublicClient, ConversationPublicClient } from '@kbn/agent-builder-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { attachImpactStepCommonDefinition } from '../../../common/impact/step_types/attach_impact_step';
import type { ResolveUser } from '../../services/resolve_user';
import { attachImpactToInvestigation } from '../attachments/attach_impact_to_investigation';
import { parseStepInput } from './parse_step_input';
import type { ImpactService } from '../services/impact_service';
import type { ImpactPrivilegesChecker } from '../services/check_impact_privileges';
import { toStepError } from './to_step_error';

/** Upserts the conversation's impact document and attaches it to Agent Builder chat. */
export const getAttachImpactStepDefinition = ({
  getImpactService,
  resolveUser,
  privileges,
  getAttachmentClient,
  getConversationClient,
}: {
  getImpactService: () => ImpactService;
  resolveUser: ResolveUser;
  privileges: ImpactPrivilegesChecker;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
  getConversationClient: (request: KibanaRequest) => Promise<ConversationPublicClient>;
}) =>
  createServerStepDefinition({
    ...attachImpactStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(attachImpactStepCommonDefinition.inputSchema, context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const request = context.contextManager.getFakeRequest();

        await privileges.assertCanManage(request);

        const service = getImpactService();
        const [attachments, conversations, user] = await Promise.all([
          getAttachmentClient(request),
          getConversationClient(request),
          resolveUser(request),
        ]);
        const impact = await attachImpactToInvestigation({
          attachments,
          conversations,
          conversationId: input.conversationId,
          readImpact: () => service.getByConversationId(input.conversationId, spaceId),
          writeImpact: () =>
            service.attach(input, {
              spaceId,
              user,
            }),
          revertImpact: (args) => service.revertAttach(args),
        });

        context.logger.debug(
          `Attached impact ${impact.id} to conversation ${impact.conversationId}`
        );

        return {
          output: {
            id: impact.id,
            entities: impact.entities,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to attach impact');
      }
    },
  });
