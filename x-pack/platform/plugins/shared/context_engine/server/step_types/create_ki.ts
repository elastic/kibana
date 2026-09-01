/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createKiStepCommonDefinition } from '../../common/step_types/create_ki';
import type { KiStepDependencies } from './helpers';
import {
  assertContextEngineEnabled,
  assertKiWritePrivilege,
  assertWritableDest,
  resolveOrCreateAiIndexDest,
} from './helpers';

export const getCreateKiStepDefinition = ({
  getAiIndexService,
  isContextEngineEnabled,
  checkWritePrivilege,
}: KiStepDependencies) =>
  createServerStepDefinition({
    ...createKiStepCommonDefinition,
    handler: async (context) => {
      const request = context.contextManager.getFakeRequest();
      await assertContextEngineEnabled(isContextEngineEnabled, request);
      await assertKiWritePrivilege(checkWritePrivilege, request);

      const { ai_index_id: aiIndexId, ki } = context.input;

      const dest = await resolveOrCreateAiIndexDest(getAiIndexService, aiIndexId);
      assertWritableDest(aiIndexId, dest);
      const esClient = context.contextManager.getScopedEsClient();

      const response = await esClient.index(
        {
          index: dest.value,
          document: { '@timestamp': new Date().toISOString(), ...ki },
          // Data streams only accept `create`; `wait_for` makes the KI visible to later steps.
          ...(dest.type === 'data_stream' && { op_type: 'create' as const }),
          refresh: 'wait_for',
        },
        { signal: context.abortSignal }
      );

      return { output: { id: response._id } };
    },
  });
