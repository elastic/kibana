/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { getImpactStepCommonDefinition } from '../../../common/impact/step_types/get_impact_step';
import { parseStepInput } from '../../proposals/step_types/parse_step_input';
import type { ImpactService } from '../services/impact_service';
import type { ImpactPrivilegesChecker } from '../services/check_impact_privileges';
import { toStepError } from './to_step_error';

/** Reads impact for a conversation and fails the step when none has been attached. */
export const getGetImpactStepDefinition = ({
  getImpactService,
  privileges,
}: {
  getImpactService: () => ImpactService;
  privileges: ImpactPrivilegesChecker;
}) =>
  createServerStepDefinition({
    ...getImpactStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = parseStepInput(getImpactStepCommonDefinition.inputSchema, context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;

        await privileges.assertCanRead(context.contextManager.getFakeRequest());

        const impact = await getImpactService().getByConversationId(input.conversationId, spaceId);

        return {
          output: {
            id: impact.id,
            entityIds: impact.entityIds,
          },
        };
      } catch (error) {
        throw toStepError(error, 'Failed to read impact');
      }
    },
  });
