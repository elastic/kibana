/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  queryAiIndexInputSchema,
  queryAiIndexStepCommonDefinition,
} from '../../common/step_types/query_ai_index';
import type { AiIndexStepDependencies } from './helpers';
import { assertContextEngineEnabled, assertKiReadPrivilege } from './helpers';
import { toStepError } from './to_step_error';

export const getQueryAiIndexStepDefinition = ({
  getAiIndexDataReadService,
  isContextEngineEnabled,
  checkReadPrivilege,
}: AiIndexStepDependencies) =>
  createServerStepDefinition({
    ...queryAiIndexStepCommonDefinition,
    handler: async (context) => {
      try {
        const request = context.contextManager.getFakeRequest();
        const { spaceId } = context.contextManager.getContext().workflow;
        await assertContextEngineEnabled(isContextEngineEnabled, spaceId);
        await assertKiReadPrivilege(checkReadPrivilege, request, spaceId);

        // The engine hands over the rendered input unparsed; parse it to apply the bounds.
        const { query, params, limit } = queryAiIndexInputSchema.parse(context.input);
        const { columns, values } = await getAiIndexDataReadService({
          esClient: context.contextManager.getScopedEsClient(),
          request,
          spaceId,
        }).query({ query, params, limit });

        const rows = values.map((row) =>
          Object.fromEntries(columns.map(({ name }, position) => [name, row[position]]))
        );
        return { output: { columns, values, rows } };
      } catch (error) {
        throw toStepError(error, 'Failed to query AI indices');
      }
    },
  });
