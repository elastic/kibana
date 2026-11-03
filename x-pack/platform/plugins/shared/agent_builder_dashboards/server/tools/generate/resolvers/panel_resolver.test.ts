/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildLensConfig,
  generateCustomContentEsql,
} from '@kbn/agent-builder-visualizations-server';
import { ESQLVariableType } from '@kbn/esql-types';
import type { ModelProvider, ToolEventEmitter } from '@kbn/agent-builder-server';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { createCustomContentTemplateResolver } from '@kbn/custom-content-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { createPanelResolver } from './panel_resolver';

jest.mock('@kbn/agent-builder-visualizations-server', () => ({
  buildLensConfig: jest.fn(),
  buildVegaConfig: jest.fn(),
  generateCustomContentEsql: jest.fn(),
}));

jest.mock('@kbn/custom-content-server', () => ({
  createCustomContentTemplateResolver: jest.fn(),
}));

const mockedBuildLensConfig = jest.mocked(buildLensConfig);
const mockedGenerateCustomContentEsql = jest.mocked(generateCustomContentEsql);
const mockedCreateTemplateResolver = jest.mocked(createCustomContentTemplateResolver);

const grid = { x: 0, y: 0, w: 12, h: 5 };

describe('createPanelResolver', () => {
  const resolveTemplate = jest.fn();
  let resolve: ReturnType<typeof createPanelResolver>;

  beforeEach(() => {
    mockedBuildLensConfig.mockReset();
    resolveTemplate.mockReset();
    mockedBuildLensConfig.mockResolvedValue({
      validatedConfig: { type: 'metric' },
    } as Awaited<ReturnType<typeof buildLensConfig>>);
    resolveTemplate.mockResolvedValue({ template: '<div>resolved</div>', height: 320 });
    mockedCreateTemplateResolver.mockReturnValue(resolveTemplate);
    resolve = createPanelResolver({
      logger: {
        debug: jest.fn(),
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      } as unknown as Logger,
      modelProvider: {} as ModelProvider,
      events: {} as ToolEventEmitter,
      esClient: {} as IScopedClusterClient,
    });
  });

  it('routes a request without renderer to the vis resolver', async () => {
    const result = await resolve({
      nlQuery: 'show total requests',
    });

    expect(result).toMatchObject({
      type: 'success',
      panelContent: { type: LENS_EMBEDDABLE_TYPE },
    });
    expect(mockedBuildLensConfig).toHaveBeenCalledTimes(1);
    expect(resolveTemplate).not.toHaveBeenCalled();
  });

  it('gives the query generator the values of the dashboard controls of a custom_content request', async () => {
    mockedGenerateCustomContentEsql.mockResolvedValue('FROM logs | WHERE host.name == ?host');
    const esqlVariables = [{ key: 'host', value: 'web-1', type: ESQLVariableType.VALUES }];

    await resolve({
      renderer: 'custom_content',
      nlQuery: 'hits for the selected host',
      hasData: true,
      resolveEsqlVariables: jest.fn().mockResolvedValue(esqlVariables),
    });

    expect(mockedGenerateCustomContentEsql).toHaveBeenCalledWith(
      expect.objectContaining({ nlQuery: 'hits for the selected host', esqlVariables })
    );
  });

  it('routes a custom_content request to the template resolver', async () => {
    const result = await resolve({
      renderer: 'custom_content',
      nlQuery: 'change the title',
      existingPanel: { id: 'cc-1', type: CUSTOM_CONTENT_EMBEDDABLE_TYPE, config: {}, grid },
    });

    expect(resolveTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'change the title' })
    );
    expect(mockedBuildLensConfig).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      type: 'success',
      panelContent: { type: CUSTOM_CONTENT_EMBEDDABLE_TYPE },
    });
  });
});
