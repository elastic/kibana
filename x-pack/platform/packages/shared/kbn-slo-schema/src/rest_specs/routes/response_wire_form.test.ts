/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Core validates the response body of a route against its declared response
 * schema in dev mode. The body is the encoded (wire) form returned by the SLO
 * services, so every response schema must accept its own encoded output.
 */

import type { z } from '@kbn/zod';
import { buildDomainSLO, buildDomainSLOWithData } from '../../test_helpers/fixtures';
import { encode } from '../../test_helpers/codec_agnostic';
import { bulkDeleteResponseSchema, bulkDeleteStatusResponseSchema } from './bulk_delete';
import { bulkPurgeRollupResponseSchema } from './bulk_purge_rollup';
import { createSLOResponseSchema } from './create';
import { findSLOResponseSchema } from './find';
import { findSloDefinitionsResponseSchema } from './find_definition';
import { getSLOResponseSchema } from './get';
import { resetSLOResponseSchema } from './reset';
import { snapshotResponseSchema } from './snapshot';
import { updateSLOResponseSchema } from './update';

const expectWireFormToParse = <S extends z.ZodType>(schema: S, value: z.output<S>) => {
  const result = schema.safeParse(encode(schema, value));
  expect(result.error?.issues).toBeUndefined();
};

describe('SLO response schemas accept their own wire form', () => {
  it('createSLOResponseSchema', () => {
    expectWireFormToParse(createSLOResponseSchema, { id: 'my-slo-id01' });
  });

  it('getSLOResponseSchema', () => {
    expectWireFormToParse(getSLOResponseSchema, buildDomainSLOWithData());
  });

  it('getSLOResponseSchema with a null summaryUpdatedAt, remote and meta', () => {
    const domain = buildDomainSLOWithData();
    expectWireFormToParse(getSLOResponseSchema, {
      ...domain,
      summary: { ...domain.summary, summaryUpdatedAt: null },
      remote: { remoteName: 'my-remote', kibanaUrl: 'https://kibana.example' },
      meta: { synthetics: { monitorId: 'monitor', locationId: 'location', configId: 'config' } },
    });
  });

  it('findSLOResponseSchema', () => {
    expectWireFormToParse(findSLOResponseSchema, {
      page: 1,
      perPage: 25,
      total: 1,
      results: [buildDomainSLOWithData()],
      searchAfter: ['cursor', 42],
      size: 10,
    });
  });

  it('updateSLOResponseSchema', () => {
    expectWireFormToParse(updateSLOResponseSchema, buildDomainSLO());
  });

  it('resetSLOResponseSchema', () => {
    expectWireFormToParse(resetSLOResponseSchema, buildDomainSLO());
  });

  it('findSloDefinitionsResponseSchema', () => {
    expectWireFormToParse(findSloDefinitionsResponseSchema, {
      page: 1,
      perPage: 25,
      total: 2,
      results: [
        buildDomainSLO(),
        {
          ...buildDomainSLO(),
          health: {
            isProblematic: false,
            rollup: { isProblematic: false, missing: false, status: 'healthy', state: 'started' },
            summary: { isProblematic: false, missing: false, status: 'healthy', state: 'started' },
          },
        },
      ],
    });
  });

  it('bulkDeleteResponseSchema', () => {
    expectWireFormToParse(bulkDeleteResponseSchema, { taskId: 'task-id' });
  });

  it.each([
    { isDone: false, results: [] },
    {
      isDone: true,
      results: [
        { id: 'slo-1', success: true },
        { id: 'slo-2', success: false, error: 'not found' },
      ],
    },
    { isDone: true, error: 'Task not found' },
  ])('bulkDeleteStatusResponseSchema %p', (value) => {
    expectWireFormToParse(bulkDeleteStatusResponseSchema, value);
  });

  it.each([{ taskId: 'node:1' }, { taskId: 42 }, {}])(
    'bulkPurgeRollupResponseSchema %p',
    (value) => {
      expectWireFormToParse(bulkPurgeRollupResponseSchema, value);
    }
  );

  it('snapshotResponseSchema with a summary and an error result', () => {
    expectWireFormToParse(snapshotResponseSchema, {
      at: '2024-01-01T00:00:00.000Z',
      results: [
        {
          id: 'slo-1',
          instanceId: '*',
          summary: {
            status: 'NO_DATA',
            sliValue: null,
            errorBudget: { initial: 0.01, consumed: null, remaining: null },
            good: 0,
            total: 0,
          },
        },
        { id: 'slo-2', instanceId: '*', error: { statusCode: 404, message: 'not found' } },
      ],
    });
  });
});
