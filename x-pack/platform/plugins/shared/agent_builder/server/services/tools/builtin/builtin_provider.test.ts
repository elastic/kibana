/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import type { ToolAvailabilityContext, ToolAvailabilityResult } from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { uiSettingsServiceMock } from '@kbn/core-ui-settings-server-mocks';
import { savedObjectsServiceMock } from '@kbn/core-saved-objects-server-mocks';
import { createBuiltinProviderFn } from './builtin_provider';
import { createBuiltinToolRegistry } from './builtin_registry';
import type { BuiltinToolTypeDefinition } from '../tool_types/definitions';

const builtinDefinition: BuiltinToolTypeDefinition = {
  toolType: ToolType.builtin,
  builtin: true,
};

describe('createBuiltinProviderFn', () => {
  const toolId = 'platform.core.test_tool';

  const createTool = (
    availability: BuiltinToolDefinition['availability']
  ): BuiltinToolDefinition => ({
    id: toolId,
    type: ToolType.builtin,
    description: 'A test tool',
    tags: [],
    annotations: {
      title: 'Test Tool',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    schema: z.object({}),
    handler: async () => ({ results: [] }),
    availability,
  });

  const createAvailabilityContext = (spaceId: string): ToolAvailabilityContext => ({
    request: httpServerMock.createKibanaRequest(),
    uiSettings: uiSettingsServiceMock.createClient(),
    spaceId,
  });

  const setup = (availability: BuiltinToolDefinition['availability']) => {
    const registry = createBuiltinToolRegistry();
    registry.register(createTool(availability));
    return createBuiltinProviderFn({
      registry,
      toolTypes: [builtinDefinition],
      uiSettings: uiSettingsServiceMock.createStartContract(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
    });
  };

  it('reuses cached availability results across the providers it creates', async () => {
    const handler = jest
      .fn<Promise<ToolAvailabilityResult>, [ToolAvailabilityContext]>()
      .mockResolvedValue({ status: 'available' });
    const providerFn = setup({ handler, cacheMode: 'space' });

    const firstProvider = await providerFn({
      request: httpServerMock.createKibanaRequest(),
      space: 'default',
    });
    const secondProvider = await providerFn({
      request: httpServerMock.createKibanaRequest(),
      space: 'default',
    });

    const firstTool = await firstProvider.get(toolId);
    const secondTool = await secondProvider.get(toolId);

    await firstTool.isAvailable(createAvailabilityContext('default'));
    await secondTool.isAvailable(createAvailabilityContext('default'));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('caches per principal for the space-user cache mode', async () => {
    const handler = jest
      .fn<Promise<ToolAvailabilityResult>, [ToolAvailabilityContext]>()
      .mockResolvedValue({ status: 'available' });
    const registry = createBuiltinToolRegistry();
    registry.register(createTool({ handler, cacheMode: 'space-user' }));
    const providerFn = createBuiltinProviderFn({
      registry,
      toolTypes: [builtinDefinition],
      uiSettings: uiSettingsServiceMock.createStartContract(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
      getPrincipalKey: (request) => String(request.headers['x-test-principal']),
    });

    const createPrincipalContext = (principal: string): ToolAvailabilityContext => ({
      request: httpServerMock.createKibanaRequest({ headers: { 'x-test-principal': principal } }),
      uiSettings: uiSettingsServiceMock.createClient(),
      spaceId: 'default',
    });

    const provider = await providerFn({
      request: httpServerMock.createKibanaRequest(),
      space: 'default',
    });
    const tool = await provider.get(toolId);

    await tool.isAvailable(createPrincipalContext('jane'));
    await tool.isAvailable(createPrincipalContext('jane'));
    expect(handler).toHaveBeenCalledTimes(1);

    await tool.isAvailable(createPrincipalContext('john'));
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('does not reuse a space-scoped result for another space', async () => {
    const handler = jest
      .fn<Promise<ToolAvailabilityResult>, [ToolAvailabilityContext]>()
      .mockResolvedValue({ status: 'available' });
    const providerFn = setup({ handler, cacheMode: 'space' });

    const firstProvider = await providerFn({
      request: httpServerMock.createKibanaRequest(),
      space: 'space-1',
    });
    const secondProvider = await providerFn({
      request: httpServerMock.createKibanaRequest(),
      space: 'space-2',
    });

    const firstTool = await firstProvider.get(toolId);
    const secondTool = await secondProvider.get(toolId);

    await firstTool.isAvailable(createAvailabilityContext('space-1'));
    await secondTool.isAvailable(createAvailabilityContext('space-2'));

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
