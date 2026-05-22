/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { builtInStepDefinitions, getElasticsearchConnectors } from '@kbn/workflows';
import { registerGetStepDefinitionsTool } from './get_step_definitions_tool';

jest.mock('@kbn/workflows-management-plugin/common/schema', () => ({
  getAllConnectors: () => {
    const { getElasticsearchConnectors: getEs } = jest.requireActual('@kbn/workflows');
    return getEs();
  },
  addDynamicConnectorsToCache: jest.fn(),
  getCachedAllConnectorsMap: () => null,
  getDeprecatedStepMetadata: () => undefined,
}));

const MAX_CHARS_PER_STEP = 5000;

describe('get_step_definitions output size', () => {
  let registeredTool: { handler: (params: any, context: any) => Promise<any> };

  beforeAll(() => {
    const agentBuilder = {
      tools: {
        register: jest.fn((tool: { handler: (params: any, context: any) => Promise<any> }) => {
          registeredTool = tool;
        }),
      },
    } as any;
    registerGetStepDefinitionsTool(agentBuilder, {
      getAvailableConnectors: jest
        .fn()
        .mockResolvedValue({ connectorTypes: {}, totalConnectors: 0 }),
    } as any);
  });

  const esStepTypes = ['elasticsearch.search', 'elasticsearch.bulk', 'elasticsearch.index'];
  const builtInIds = builtInStepDefinitions.map((s) => s.id);

  it.each(esStepTypes)(
    'compact output for "%s" is under the character threshold',
    async (stepType) => {
      const esConnectors = getElasticsearchConnectors();
      const exists = esConnectors.some((c) => c.type === stepType);
      if (!exists) {
        return;
      }

      const result = await registeredTool.handler(
        { stepType } as any,
        { spaceId: 'default', request: {} } as any
      );
      const data = result.results[0].data as any;
      const json = JSON.stringify(data);

      expect(json.length).toBeLessThan(MAX_CHARS_PER_STEP);
    }
  );

  it.each(builtInIds)(
    'compact output for built-in step "%s" is under the character threshold',
    async (stepType) => {
      const result = await registeredTool.handler(
        { stepType } as any,
        { spaceId: 'default', request: {} } as any
      );
      const data = result.results[0].data as any;
      const json = JSON.stringify(data);

      expect(json.length).toBeLessThan(MAX_CHARS_PER_STEP);
    }
  );

  it('compact output for all ES connectors combined (condensed list) is under 5000 chars', async () => {
    const result = await registeredTool.handler(
      { category: 'elasticsearch' } as any,
      { spaceId: 'default', request: {} } as any
    );
    const data = result.results[0].data as any;
    const json = JSON.stringify(data);

    expect(json.length).toBeLessThan(5000);
  });
});
