/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AttachmentPublicClient } from '@kbn/agent-builder-server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { attachImpactStepCommonDefinition } from '../../../common/impact/step_types/attach_impact_step';
import type { ResolveUser } from '../../services/resolve_user';
import { stampImpactAttachment } from '../attachments/stamp_impact_attachment';
import { parseStepInput } from './parse_step_input';
import type { ImpactService } from '../services/impact_service';
import type { ImpactPrivilegesChecker } from '../services/check_impact_privileges';
import { toStepError } from './to_step_error';

/** Upserts the conversation's impact document and stamps it onto Agent Builder chat. */
export const getAttachImpactStepDefinition = ({
  getImpactService,
  resolveUser,
  privileges,
  getAttachmentClient,
}: {
  getImpactService: () => ImpactService;
  resolveUser: ResolveUser;
  privileges: ImpactPrivilegesChecker;
  getAttachmentClient: (request: KibanaRequest) => Promise<AttachmentPublicClient>;
}) =>
  createServerStepDefinition({
    ...attachImpactStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(attachImpactStepCommonDefinition.inputSchema, context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const request = context.contextManager.getFakeRequest();

        await privileges.assertCanManage(request);

        const impact = await getImpactService().attach(input, {
          spaceId,
          user: await resolveUser(request),
        });

        await stampImpactAttachment({
          client: await getAttachmentClient(request),
          impact,
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
