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
  extractReferencedIndices,
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

describe('extractReferencedIndices', () => {
  it('parses a single FROM index', () => {
    expect(extractReferencedIndices('FROM .ml-anomalies-* | LIMIT 10')).toEqual([
      '.ml-anomalies-*',
    ]);
  });

  it('parses multiple comma-separated FROM indices', () => {
    expect(extractReferencedIndices('FROM .ml-anomalies-*, .ml-config | WHERE true')).toEqual([
      '.ml-anomalies-*',
      '.ml-config',
    ]);
  });

  it('includes LOOKUP JOIN targets', () => {
    expect(
      extractReferencedIndices('FROM .ml-config | LOOKUP JOIN secrets ON job_id | LIMIT 1')
    ).toEqual(['.ml-config', 'secrets']);
  });

  it('returns empty when FROM is missing', () => {
    expect(extractReferencedIndices('ROW 1')).toEqual([]);
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

  it('rejects LOOKUP JOIN to a non-ML index', () => {
    expect(
      validateMlSystemIndexQuery('FROM .ml-config | LOOKUP JOIN secrets ON job_id | LIMIT 1')
    ).toMatch(/disallowed index/);
  });

  it('allows LOOKUP JOIN when the target is an allowed ML index', () => {
    expect(
      validateMlSystemIndexQuery(
        'FROM .ml-anomalies-for-specific-job | LOOKUP JOIN .ml-config ON job_id | LIMIT 1'
      )
    ).toBeUndefined();
  });

  it('rejects ENRICH', () => {
    expect(
      validateMlSystemIndexQuery('FROM .ml-config | ENRICH some_policy ON job_id | LIMIT 1')
    ).toMatch(/ENRICH is not permitted/);
  });

  it('ignores ENRICH mentioned only in comments', () => {
    expect(
      validateMlSystemIndexQuery('FROM .ml-config // ENRICH not executed\n| LIMIT 1')
    ).toBeUndefined();
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

  it('does not teach calling with an empty params object or missing query', () => {
    // Models copy description examples; an empty params object causes {} / missing-query calls.
    expect(queryAnomaliesTool.description).not.toMatch(/"params"\s*:\s*\{\s*\}/);
    // Must front-load the "read before call" requirement and forbid empty calls.
    expect(queryAnomaliesTool.description).toMatch(/never call this tool without `query`/i);
    expect(queryAnomaliesTool.description).toMatch(/omit the `params` field entirely/i);
    // Must list the referenced ES|QL files explicitly so agents know where to look.
    expect(queryAnomaliesTool.description).toMatch(/esql-read-queries/i);
    expect(queryAnomaliesTool.description).toMatch(/esql-metadata-queries/i);
    expect(queryAnomaliesTool.description).toMatch(/esql-score-queries/i);
  });

  describe('handler', () => {
    it('executes ES|QL as the internal user for allowed .ml indices', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);
      const query = `FROM .ml-config
| WHERE job_type == "anomaly_detector"
| STATS job_count = COUNT(*),
        job_ids = VALUES(job_id)`;

      const result = await queryAnomaliesTool.handler({ query, limit: 100 }, context);

      expect(esClient.asInternalUser.esql.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('FROM .ml-config'),
          drop_null_columns: true,
          allow_partial_results: true,
        })
      );
      expect(esClient.asCurrentUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as { results: Array<{ type: string; data?: unknown }> };
      expect(standardResult.results).toEqual(
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
        { query, params: { job_id_pattern: 'web-*', min_score: 75 }, limit: 100 },
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

      const result = await queryAnomaliesTool.handler(
        { query: 'FROM logs-* | LIMIT 10', limit: 100 },
        context
      );

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/disallowed index/);
    });

    it('rejects LOOKUP JOIN to non-ML indices without calling ES', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        {
          query: 'FROM .ml-config | LOOKUP JOIN secrets ON job_id | LIMIT 1',
          limit: 100,
        },
        context
      );

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/disallowed index/);
    });

    it('rejects ENRICH without calling ES', async () => {
      const esClient = createEsClientMock();
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        {
          query: 'FROM .ml-config | ENRICH some_policy ON job_id | LIMIT 1',
          limit: 100,
        },
        context
      );

      expect(esClient.asInternalUser.esql.query).not.toHaveBeenCalled();
      const standardResult = result as {
        results: Array<{ type: string; data: { message: string } }>;
      };
      expect(standardResult.results[0].type).toBe(ToolResultType.error);
      expect(standardResult.results[0].data.message).toMatch(/ENRICH is not permitted/);
    });

    it('returns an error result when ES|QL throws', async () => {
      const esClient = createEsClientMock();
      esClient.asInternalUser.esql.query.mockRejectedValue(new Error('parsing_exception'));
      const context = createContext(esClient);

      const result = await queryAnomaliesTool.handler(
        { query: 'FROM .ml-config | LIMIT 1', limit: 100 },
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
