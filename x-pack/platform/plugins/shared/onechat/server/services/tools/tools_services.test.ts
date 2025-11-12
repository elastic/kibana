/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock, uiSettingsServiceMock } from '@kbn/core/server/mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { isAllowedBuiltinTool } from '@kbn/onechat-server/allow_lists';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { ToolsService } from './tools_service';
import { createMockedBuiltinTool } from '../../test_utils/tools';
import type { LlmTasksPluginStart } from '@kbn/llm-tasks-plugin/server';

jest.mock('@kbn/onechat-server/allow_lists');

const isAllowedBuiltinToolMock = isAllowedBuiltinTool as jest.MockedFunction<
  typeof isAllowedBuiltinTool
>;

describe('ToolsService', () => {
  let logger: ReturnType<typeof loggerMock.create>;
  let service: ToolsService;
  let mockLlmTasks: jest.Mocked<LlmTasksPluginStart>;

  beforeEach(() => {
    logger = loggerMock.create();
    service = new ToolsService();
    mockLlmTasks = {
      retrieveDocumentationAvailable: jest.fn(),
      retrieveDocumentation: jest.fn(),
    } as unknown as jest.Mocked<LlmTasksPluginStart>;
  });

  afterEach(() => {
    isAllowedBuiltinToolMock.mockReset();
  });

  describe('#setup', () => {
    it('allows registering allowed built-in tools', () => {
      isAllowedBuiltinToolMock.mockReturnValue(true);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedBuiltinTool())).not.toThrow();
    });

    it('throws an error trying to register non-allowed built-in tools', () => {
      isAllowedBuiltinToolMock.mockReturnValue(false);

      const serviceSetup = service.setup({ logger });

      expect(() => serviceSetup.register(createMockedBuiltinTool()))
        .toThrowErrorMatchingInlineSnapshot(`
        "Built-in tool with id \\"test-tool\\" is not in the list of allowed built-in tools.
                     Please add it to the list of allowed built-in tools in the \\"@kbn/onechat-server/allow_lists.ts\\" file."
      `);
    });
  });

  describe('#start', () => {
    const createStartDeps = (llmTasks?: LlmTasksPluginStart) => ({
      getRunner: jest.fn(),
      elasticsearch: elasticsearchServiceMock.createStart(),
      spaces: undefined,
      uiSettings: uiSettingsServiceMock.createStartContract(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
      llmTasks,
    });

    beforeEach(() => {
      service.setup({ logger });
    });

    it('registers product documentation tool when retrieveDocumentationAvailable returns true', async () => {
      mockLlmTasks.retrieveDocumentationAvailable.mockResolvedValue(true);

      const startDeps = createStartDeps(mockLlmTasks);
      await service.start(startDeps);

      expect(mockLlmTasks.retrieveDocumentationAvailable).toHaveBeenCalledWith({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      expect(logger.info).toHaveBeenCalledWith('Product documentation tool registered');
    });

    it('does not register product documentation tool when retrieveDocumentationAvailable returns false', async () => {
      mockLlmTasks.retrieveDocumentationAvailable.mockResolvedValue(false);

      const startDeps = createStartDeps(mockLlmTasks);
      await service.start(startDeps);

      expect(mockLlmTasks.retrieveDocumentationAvailable).toHaveBeenCalledWith({
        inferenceId: defaultInferenceEndpoints.ELSER,
      });
      expect(logger.debug).toHaveBeenCalledWith(
        'Product documentation tool not registered: documentation not available'
      );
      expect(logger.info).not.toHaveBeenCalledWith('Product documentation tool registered');
    });

    it('does not register product documentation tool when llmTasks is undefined', async () => {
      const startDeps = createStartDeps(undefined);
      await service.start(startDeps);

      expect(logger.info).not.toHaveBeenCalledWith('Product documentation tool registered');
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('handles errors when checking documentation availability', async () => {
      const error = new Error('Availability check failed');
      mockLlmTasks.retrieveDocumentationAvailable.mockRejectedValue(error);

      const startDeps = createStartDeps(mockLlmTasks);
      await service.start(startDeps);

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to check product documentation availability: Availability check failed'
      );
      expect(logger.info).not.toHaveBeenCalledWith('Product documentation tool registered');
    });

    it('treats null/undefined return value as false', async () => {
      mockLlmTasks.retrieveDocumentationAvailable.mockResolvedValue(null as any);

      const startDeps = createStartDeps(mockLlmTasks);
      await service.start(startDeps);

      expect(logger.debug).toHaveBeenCalledWith(
        'Product documentation tool not registered: documentation not available'
      );
      expect(logger.info).not.toHaveBeenCalledWith('Product documentation tool registered');
    });
  });
});
