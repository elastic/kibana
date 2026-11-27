/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsServiceMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { isAllowedBuiltinTool } from '@kbn/agent-builder-server/allow_lists';
import { ToolsService } from './tools_service';
import type { AgentBuilderConfig } from '../../config';
import { createMockedBuiltinTool } from '../../test_utils/tools';

jest.mock('@kbn/agent-builder-server/allow_lists');

const isAllowedBuiltinToolMock = isAllowedBuiltinTool as jest.MockedFunction<
  typeof isAllowedBuiltinTool
>;

describe('ToolsService', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let service: ToolsService;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new ToolsService();
  });

  afterEach(() => {
    isAllowedBuiltinToolMock.mockReset();
  });

  describe('#setup', () => {
    it('allows registering allowed built-in tools', () => {
      isAllowedBuiltinToolMock.mockReturnValue(true);

      const serviceSetup = service.setup({
        logger,
        config: {
          enabled: true,
          githubBaseUrl: 'https://github.com',
          topSnippets: { numSnippets: 2, numWords: 750 },
          tracing: {
            exporters: [],
            scheduledDelay: 1000,
            opik_distributed_tracing: false,
          },
        },
      });

      expect(() => serviceSetup.register(createMockedBuiltinTool())).not.toThrow();
    });

    it('throws an error trying to register non-allowed built-in tools', () => {
      isAllowedBuiltinToolMock.mockReturnValue(false);

      const serviceSetup = service.setup({
        logger,
        config: {
          enabled: true,
          githubBaseUrl: 'https://github.com',
          topSnippets: { numSnippets: 2, numWords: 750 },
          tracing: {
            exporters: [],
            scheduledDelay: 1000,
            opik_distributed_tracing: false,
          },
        },
      });

      expect(() => serviceSetup.register(createMockedBuiltinTool()))
        .toThrowErrorMatchingInlineSnapshot(`
        "Built-in tool with id \\"test-tool\\" is not in the list of allowed built-in tools.
                     Please add it to the list of allowed built-in tools in the \\"@kbn/agent-builder-server/allow_lists.ts\\" file."
      `);
    });
  });

  describe('#start', () => {
    const config: AgentBuilderConfig = {
      enabled: true,
      githubBaseUrl: 'https://github.com',
      topSnippets: { numSnippets: 2, numWords: 750 },
      tracing: {
        exporters: [],
        scheduledDelay: 1000,
        opik_distributed_tracing: false,
      },
    };

    it('reuses availability results across the registries it creates', async () => {
      isAllowedBuiltinToolMock.mockReturnValue(true);
      const availabilityHandler = jest.fn().mockResolvedValue({ status: 'available' });
      const tool = createMockedBuiltinTool({
        availability: { cacheMode: 'space', handler: availabilityHandler },
      });

      service.setup({ logger, config }).register(tool);
      const { getRegistry } = service.start({
        getRunner: jest.fn(),
        elasticsearch: elasticsearchServiceMock.createStart(),
        uiSettings: uiSettingsServiceMock.createStartContract(),
        savedObjects: savedObjectsServiceMock.createStartContract(),
        actions: actionsMock.createStart(),
        securityPlugin: undefined,
        getPrincipalKey: () => undefined,
      });

      const firstRegistry = await getRegistry({ request: httpServerMock.createKibanaRequest() });
      const secondRegistry = await getRegistry({ request: httpServerMock.createKibanaRequest() });

      await firstRegistry.get(tool.id);
      await secondRegistry.get(tool.id);

      expect(availabilityHandler).toHaveBeenCalledTimes(1);
    });
  });
});
