/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

import { EnrichEsqlRowsStep } from './enrich_esql_rows_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRulePipelineState,
  createRuleResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  getRuleExecutionRowEnricher,
  registerRuleExecutionRowEnricher,
} from '../row_enrichment/register_row_enricher';

describe('EnrichEsqlRowsStep', () => {
  let step: EnrichEsqlRowsStep;
  let scopedClusterClient: jest.Mocked<IScopedClusterClient>;

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    scopedClusterClient = {
      asCurrentUser: esClient,
      asInternalUser: esClient,
    } as unknown as jest.Mocked<IScopedClusterClient>;
    step = new EnrichEsqlRowsStep(loggerService, scopedClusterClient);
  });

  afterEach(() => {
    registerRuleExecutionRowEnricher(async (ctx) => ctx.rows);
    jest.clearAllMocks();
  });

  it('passes rows through when enricher returns the same logical rows', async () => {
    registerRuleExecutionRowEnricher(async (ctx) => ctx.rows);
    const rows = [{ 'host.name': 'a' }];
    const state = createRulePipelineState({
      rule: createRuleResponse(),
      esqlRowBatch: rows,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    if (result.type === 'continue') {
      expect(result.state.esqlRowBatch).toEqual(rows);
    }
  });

  it('applies registered enricher before alert events are built', async () => {
    registerRuleExecutionRowEnricher(async (ctx) =>
      ctx.rows.map((row) => ({ ...row, test_enrichment: true }))
    );

    const rows = [{ 'host.name': 'a' }];
    const state = createRulePipelineState({
      rule: createRuleResponse(),
      esqlRowBatch: rows,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result.type).toBe('continue');
    if (result.type === 'continue') {
      expect(result.state.esqlRowBatch).toEqual([{ 'host.name': 'a', test_enrichment: true }]);
    }
    expect(getRuleExecutionRowEnricher()).toBeDefined();
  });

  it('halts with state_not_ready when rule or esqlRowBatch is missing', async () => {
    const state = createRulePipelineState();
    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'halt', reason: 'state_not_ready', state });
  });

  it('returns original rows when enricher throws', async () => {
    registerRuleExecutionRowEnricher(async () => {
      throw new Error('boom');
    });

    const rows = [{ 'host.name': 'a' }];
    const state = createRulePipelineState({
      rule: createRuleResponse(),
      esqlRowBatch: rows,
    });

    const [result] = await collectStreamResults(step.executeStream(createPipelineStream([state])));

    expect(result).toEqual({ type: 'continue', state });
  });
});
