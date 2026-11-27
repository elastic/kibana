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
import { AvailabilityCache } from '../../common/availability_cache';
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
      availabilityCache: new AvailabilityCache(),
    });
  };

  it('shares the availability cache it is given across the providers it creates', async () => {
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
