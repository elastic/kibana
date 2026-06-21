/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildVegaConfig } from '@kbn/agent-builder-tools-base';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createVegaPanelResolver } from './vega_panel_resolver';
import { VEGA_PANEL_EMBEDDABLE_TYPE } from './core/operations/panels/vega';

jest.mock('@kbn/agent-builder-tools-base', () => ({
  buildVegaConfig: jest.fn(),
}));

const mockedBuildVegaConfig = jest.mocked(buildVegaConfig);

const createMockLogger = (): Logger =>
  ({
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  } as unknown as Logger);

describe('createVegaPanelResolver', () => {
  const logger = createMockLogger();
  const modelProvider = {} as ModelProvider;
  const events = {} as ToolEventEmitter;
  const esClient = {} as IScopedClusterClient;

  const spec = '{"$schema":"https://vega.github.io/schema/vega-lite/v5.json","mark":"bar"}';

  beforeEach(() => {
    mockedBuildVegaConfig.mockReset();
    mockedBuildVegaConfig.mockResolvedValue({ spec, esqlQuery: 'FROM logs | STATS c = COUNT(*)' });
  });

  it('creates a by-value Vega panel (Vega embeddable API shape) for create requests', async () => {
    const resolveVegaPanel = createVegaPanelResolver({ logger, modelProvider, events, esClient });

    const result = await resolveVegaPanel({
      type: 'vega',
      operationType: 'add_panels',
      identifier: 'small multiples of cpu per host',
      nlQuery: 'small multiples of cpu per host',
      index: 'metrics-*',
    });

    expect(result).toEqual({
      type: 'success',
      panelContent: {
        type: VEGA_PANEL_EMBEDDABLE_TYPE,
        config: { spec },
      },
    });
    expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
      expect.objectContaining({ nlQuery: 'small multiples of cpu per host', index: 'metrics-*' })
    );
  });

  it('passes the existing spec when editing a Vega panel', async () => {
    const resolveVegaPanel = createVegaPanelResolver({ logger, modelProvider, events, esClient });

    await resolveVegaPanel({
      type: 'vega',
      operationType: 'edit_panels',
      identifier: 'panel-1',
      nlQuery: 'facet by region instead of host',
      existingPanel: {
        id: 'panel-1',
        type: VEGA_PANEL_EMBEDDABLE_TYPE,
        config: { spec: '{"old":true}' },
        grid: { w: 24, h: 12, x: 0, y: 0 },
      },
    });

    expect(mockedBuildVegaConfig).toHaveBeenCalledWith(
      expect.objectContaining({ existingSpec: '{"old":true}' })
    );
  });

  it('returns a failure when editing a non-Vega panel', async () => {
    const resolveVegaPanel = createVegaPanelResolver({ logger, modelProvider, events, esClient });

    const result = await resolveVegaPanel({
      type: 'vega',
      operationType: 'edit_panels',
      identifier: 'panel-1',
      nlQuery: 'make it faceted',
      existingPanel: {
        id: 'panel-1',
        type: LENS_EMBEDDABLE_TYPE,
        config: { type: 'bar' },
        grid: { w: 24, h: 12, x: 0, y: 0 },
      },
    });

    expect(result).toEqual({
      type: 'failure',
      failure: {
        type: 'edit_panels',
        identifier: 'panel-1',
        error: `Panel "panel-1" with type "${LENS_EMBEDDABLE_TYPE}" is not a Vega visualization and cannot be edited as one.`,
      },
    });
    expect(mockedBuildVegaConfig).not.toHaveBeenCalled();
  });
});
