/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createDynamicQueries } from './create_queries';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { PARAMETER_NOT_FOUND } from '../../../common/translations/errors';

describe('create queries', () => {
  const defualtQueryParams = {
    interval: 3600,
    platform: 'linux',
    version: '1.0.0',
    ecs_mapping: {},
    removed: false,
    snapshot: true,
  };
  const TEST_AGENT = 'test-agent';

  const mockedQueriesParams = {
    queries: [
      {
        query: 'SELECT * FROM processes where pid={{process.pid}};',
        id: 'process_with_params',
        ...defualtQueryParams,
      },
      {
        query: 'SELECT * FROM processes where pid={{process.not-existing}};',
        id: 'process_wrong_params',
        ...defualtQueryParams,
      },
      {
        query: 'SELECT * FROM processes;',
        id: 'process_no_params',
        ...defualtQueryParams,
      },
    ],
    agent_ids: ['929be3ee-13ee-4219-bcc2-5aa1593e8193'],
    alert_ids: ['72ae3004b99b747e26c81ae7e4bd978677ec5973234674fef6e4993fa54c9acc'],
  };
  const mockedSingleQueryParams = {
    query: 'SELECT * FROM processes where pid={{process.pid}};',
    interval: 3600,
    id: 'process_with_params',
    platform: 'linux',
  };

  // Info: getting queries by index (eg. [1], [0]) because can't compare whole query object due to unique action_id generated.
  describe('dynamic', () => {
    const pid = 123;
    it('alertData, multi queries, should replace queries and show errors', async () => {
      const queries = await createDynamicQueries({
        params: mockedQueriesParams,
        agents: [TEST_AGENT],
        alertData: {
          process: {
            pid,
          },
        } as unknown as ParsedTechnicalFields & { _index: string },
        osqueryContext: {} as OsqueryAppContext,
      });
      expect(queries[0].query).toBe(`SELECT * FROM processes where pid=${pid};`);
      expect(queries[0].error).toBe(undefined);
      expect(queries[1].query).toBe('SELECT * FROM processes where pid={{process.not-existing}};');
      expect(queries[1].error).toBe(PARAMETER_NOT_FOUND);
      expect(queries[2].query).toBe('SELECT * FROM processes;');
      expect(queries[2].error).toBe(undefined);
    });

    it('alertData, single query, existing param should return changed query', async () => {
      const queries = await createDynamicQueries({
        params: mockedSingleQueryParams,
        agents: [TEST_AGENT],
        alertData: {
          process: { pid },
        } as unknown as ParsedTechnicalFields & { _index: string },
        osqueryContext: {} as OsqueryAppContext,
      });
      expect(queries[0].query).toBe(`SELECT * FROM processes where pid=${pid};`);
      expect(queries[0].error).toBe(undefined);
    });
    it('alertData, single query, not existing param should return error', async () => {
      const queries = await createDynamicQueries({
        params: mockedSingleQueryParams,
        agents: [TEST_AGENT],
        alertData: {
          process: {},
        } as unknown as ParsedTechnicalFields & { _index: string },
        osqueryContext: {} as OsqueryAppContext,
      });
      expect(queries[0].query).toBe('SELECT * FROM processes where pid={{process.pid}};');
      expect(queries[0].error).toBe(PARAMETER_NOT_FOUND);
    });
    it('no alert data, multi query, return unchanged queries no error', async () => {
      const queries = await createDynamicQueries({
        params: mockedQueriesParams,
        agents: [TEST_AGENT],
        osqueryContext: {} as OsqueryAppContext,
      });
      expect(queries[0].query).toBe('SELECT * FROM processes where pid={{process.pid}};');
      expect(queries[0].agents).toContain(TEST_AGENT);
      expect(queries[0].error).toBe(undefined);
      expect(queries[2].query).toBe('SELECT * FROM processes;');
      expect(queries[2].agents).toContain(TEST_AGENT);
      expect(queries[2].error).toBe(undefined);
    });

    it('no alert data, single query, return unchanged query and no error', async () => {
      const queries = await createDynamicQueries({
        params: mockedSingleQueryParams,
        agents: [TEST_AGENT],
        osqueryContext: {} as OsqueryAppContext,
      });
      expect(queries[0].query).toBe('SELECT * FROM processes where pid={{process.pid}};');
      expect(queries[0].agents).toContain(TEST_AGENT);
      expect(queries[0].error).toBe(undefined);
    });
  });
});
