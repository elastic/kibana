/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { judgeVisualizationEsql } from './judge_visualization_esql';

const createMockLogger = (): Logger =>
  ({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger);

describe('judgeVisualizationEsql', () => {
  const invoke = jest.fn();
  const selectModel = jest.fn();
  const getDefaultModel = jest.fn();
  const hasFastModel = jest.fn();
  const modelProvider = {
    hasFastModel,
    selectModel,
    getDefaultModel,
  } as unknown as ModelProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    invoke.mockResolvedValue({ keep: true });
    const scopedModel = {
      chatModel: { withStructuredOutput: jest.fn(() => ({ invoke })) },
    };
    hasFastModel.mockResolvedValue(true);
    selectModel.mockResolvedValue(scopedModel);
    getDefaultModel.mockResolvedValue(scopedModel);
  });

  it('keeps a query that matches the request and guidance', async () => {
    const keep = await judgeVisualizationEsql({
      query: 'FROM logs | STATS count = COUNT()',
      nlQuery: 'total request count',
      instructions: 'use ?_tstart for time series',
      modelProvider,
      logger: createMockLogger(),
    });

    expect(keep).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
    const [, human] = invoke.mock.calls[0][0];
    expect(human[1]).toContain('total request count');
    expect(human[1]).toContain('FROM logs | STATS count = COUNT()');
    expect(human[1]).toContain('use ?_tstart for time series');
  });

  it('rejects a query that should be rewritten', async () => {
    invoke.mockResolvedValue({ keep: false });

    await expect(
      judgeVisualizationEsql({
        query: 'FROM logs | STATS count = COUNT() BY bucket = DATE_TRUNC(1 hour, @timestamp)',
        nlQuery: 'request volume over time',
        instructions: 'do not use DATE_TRUNC',
        modelProvider,
        logger: createMockLogger(),
      })
    ).resolves.toBe(false);
  });

  it('uses the default model when no fast model is available', async () => {
    hasFastModel.mockResolvedValue(false);

    await judgeVisualizationEsql({
      query: 'FROM logs',
      nlQuery: 'count logs',
      instructions: 'guidance',
      modelProvider,
      logger: createMockLogger(),
    });

    expect(getDefaultModel).toHaveBeenCalledTimes(1);
    expect(selectModel).not.toHaveBeenCalled();
  });
});
