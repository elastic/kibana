/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { getAdminCapabilities } from '../../lib/capabilities/__mocks__/ml_capabilities';
import {
  createQueryAnomaliesTool,
  extractFromIndices,
  isAllowedMlIndex,
  validateMlSystemIndexQuery,
} from './query_anomalies';
import { QUERY_ANOMALIES_TOOL_ID } from './tool_ids';

const resolveMlCapabilities = jest.fn().mockResolvedValue(getAdminCapabilities());
const queryAnomaliesTool = createQueryAnomaliesTool(resolveMlCapabilities);

const createEsClientMock = () => ({
  asInternalUser: {
    esql: {
      query: jest.fn().mockResolvedValue({
        columns: [{ name: 'job_id', type: 'keyword' }],
        values: [['my-job']],
      }),
    },
  },
  asCurrentUser: {
    esql: {
      query: jest.fn(),
    },
  },
});

const createContext = (esClient = createEsClientMock()) =>
  ({
    esClient,
    request: {},
  } as any);

describe('extractFromIndices', () => {
  it('parses a single index', () => {
    expect(extractFromIndices('FROM .ml-anomalies-* | LIMIT 10')).toEqual(['.ml-anomalies-*']);
  });

  it('parses multiple comma-separated indices', () => {
    expect(extractFromIndices('FROM .ml-anomalies-*, .ml-config | WHERE true')).toEqual([
      '.ml-anomalies-*',
      '.ml-config',
    ]);
  });

  it('strips quotes', () => {
    expect(extractFromIndices('FROM ".ml-notifications-*" | LIMIT 1')).toEqual([
      '.ml-notifications-*',
    ]);
  });

  it('returns null when FROM is missing', () => {
    expect(extractFromIndices('ROW 1')).toBeNull();
  });
});

describe('isAllowedMlIndex', () => {
  it.each([
    '.ml-anomalies-*',
    '.ml-anomalies-shared',
    '.ml-config',
    '.ml-notifications-*',
    '.ml-annotations-*',
  ])('allows %s', (index) => {
    expect(isAllowedMlIndex(index)).toBe(true);
  });

  it.each(['*', 'logs-*', '.kibana', 'remote:.ml-anomalies-*', '.ml-state'])(
    'rejects %s',
    (index) => {
      expect(isAllowedMlIndex(index)).toBe(false);
    }
  );
});

describe('validateMlSystemIndexQuery', () => {
  it('returns undefined for an allowed query', () => {
    expect(validateMlSystemIndexQuery('FROM .ml-anomalies-* | LIMIT 10')).toBeUndefined();
  });

  it('rejects source-data wildcards', () => {
    expect(validateMlSystemIndexQuery('FROM * METADATA _index | LIMIT 10')).toMatch(
      /disallowed index/
    );
  });
});

describe('queryAnomaliesTool', () => {
  it('has the correct ID and type', () => {
    expect(queryAnomaliesTool.id).toBe(QUERY_ANOMALIES_TOOL_ID);
    expect(queryAnomaliesTool.type).toBe(ToolType.builtin);
  });

  it('has a non-empty description', () => {
    expect(queryAnomaliesTool.description).toBeTruthy();
  });

  describe('handler', () => {
    it('executes ES|QL as the internal user for allowed .ml indices', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query = `FROM .ml-config
| WHERE job_type == "anomaly_detector"
| STATS job_count = COUNT(*),
        job_ids = VALUES(job_id)`;

      const result = await queryAnomaliesTool.handler({ query }, context);

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('FROM .ml-config'),
          drop_null_columns: true,
          allow_partial_results: true,
        })
      );
      expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
      expect(result.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: ToolResultType.query }),
          expect.objectContaining({
            type: ToolResultType.esqlResults,
            data: expect.objectContaining({
              columns: [{ name: 'job_id', type: 'keyword' }],
              values: [['my-job']],
            }),
          }),
        ])
      );
    });

    it('passes bound params through to ES|QL', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query =
        'FROM .ml-anomalies-* | WHERE job_id LIKE ?job_id_pattern AND record_score >= ?min_score';

      await queryAnomaliesTool.handler(
        { query, params: { job_id_pattern: 'web-*', min_score: 75 } },
        context
      );

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          params: [{ job_id_pattern: 'web-*' }, { min_score: 75 }],
        })
      );
    });

    it('rejects queries against non-ML indices without calling ES', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler({ query: 'FROM logs-* | LIMIT 10' }, context);

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/disallowed index/);
    });

    it('returns an error result when ES|QL throws', async () => {
      const esClient = createEsClientMock();
      esClient.asInternalUser.esql.query.mockRejectedValue(new Error('parsing_exception'));
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        { query: 'FROM .ml-config | LIMIT 1' },
        context
      );

      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toBe(
        'Error executing ES|QL query: parsing_exception'
      );
    });
  });
});
