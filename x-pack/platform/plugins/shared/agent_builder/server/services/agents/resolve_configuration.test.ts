/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import type {
  AgentConfigContext,
  AgentTypeDefinition,
  AgentTypeRegistry,
} from '@kbn/agent-builder-server/agents';
import { createConfigurationResolver } from './resolve_configuration';

const createTypeRegistryStub = (types: AgentTypeDefinition[]): AgentTypeRegistry => {
  const typeMap = new Map<string, AgentTypeDefinition>(types.map((type) => [type.id, type]));
  if (!typeMap.has(chatAgentTypeId)) {
    typeMap.set(chatAgentTypeId, { id: chatAgentTypeId, baseConfiguration: {} });
  }
  return {
    register: jest.fn(),
    has: (id) => typeMap.has(id),
    get: (id) => typeMap.get(id),
    list: () => [...typeMap.values()],
  };
};

const ctx: AgentConfigContext = {
  request: httpServerMock.createKibanaRequest(),
  spaceId: 'space-1',
};

describe('createConfigurationResolver', () => {
  it('merges the type base under the agent configuration', async () => {
    const logger = loggerMock.create();
    const resolver = createConfigurationResolver({
      typeRegistry: createTypeRegistryStub([
        {
          id: 'investigation',
          baseConfiguration: { skill_ids: ['base-skill'], connector_ids: [] },
        },
      ]),
      logger,
    });

    const effective = await resolver.resolveConfig({
      agentType: 'investigation',
      configuration: { tools: [], skill_ids: ['my-skill'], connector_ids: ['github-1'] },
      ctx,
    });

    expect(effective.skill_ids).toEqual(['base-skill', 'my-skill']);
    expect(effective.connector_ids).toEqual(['github-1']);
  });

  it('resolves chat agents against the empty base (identity)', async () => {
    const resolver = createConfigurationResolver({
      typeRegistry: createTypeRegistryStub([]),
      logger: loggerMock.create(),
    });
    const configuration = { tools: [], instructions: 'mine' };

    const effective = await resolver.resolveConfig({
      agentType: chatAgentTypeId,
      configuration,
      ctx,
    });

    expect(effective).toEqual(configuration);
  });

  it('invokes a function base with the resolution context', async () => {
    const baseConfiguration = jest.fn().mockResolvedValue({ skill_ids: ['from-fn'] });
    const resolver = createConfigurationResolver({
      typeRegistry: createTypeRegistryStub([{ id: 'investigation', baseConfiguration }]),
      logger: loggerMock.create(),
    });

    const effective = await resolver.resolveConfig({
      agentType: 'investigation',
      configuration: { tools: [] },
      ctx,
    });

    expect(effective.skill_ids).toEqual(['from-fn']);
    expect(baseConfiguration).toHaveBeenCalledWith(ctx);
  });

  it('falls back to the chat base for an unknown type and warns once per type', async () => {
    const logger = loggerMock.create();
    const resolver = createConfigurationResolver({
      typeRegistry: createTypeRegistryStub([]),
      logger,
    });
    const configuration = { tools: [], instructions: 'mine' };

    const first = await resolver.resolveConfig({ agentType: 'ghost', configuration, ctx });
    await resolver.resolveConfig({ agentType: 'ghost', configuration, ctx });

    // chat base is empty, so an unknown type resolves to the raw configuration
    expect(first).toEqual(configuration);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"ghost"'));
  });

  describe('resolveBase', () => {
    const chatBase = { ai_indices: ['elastic'] };

    it('returns the type base configuration', async () => {
      const resolver = createConfigurationResolver({
        typeRegistry: createTypeRegistryStub([
          { id: 'investigation', baseConfiguration: { ai_indices: ['sig-events'] } },
        ]),
        logger: loggerMock.create(),
      });

      expect(await resolver.resolveBase('investigation', ctx)).toEqual({
        ai_indices: ['sig-events'],
      });
    });

    it('resolves the function form against the request context', async () => {
      const baseConfiguration = jest.fn().mockReturnValue({ ai_indices: ['per-request'] });
      const resolver = createConfigurationResolver({
        typeRegistry: createTypeRegistryStub([{ id: 'investigation', baseConfiguration }]),
        logger: loggerMock.create(),
      });

      expect(await resolver.resolveBase('investigation', ctx)).toEqual({
        ai_indices: ['per-request'],
      });
      expect(baseConfiguration).toHaveBeenCalledWith(ctx);
    });

    // The merge path deliberately substitutes the chat base so execution keeps working. Reporting
    // that substitution as the agent's own configuration would misattribute another type's values,
    // so `resolveBase` says "unknown" instead.
    it('returns undefined for an unknown type instead of falling back to the chat base', async () => {
      const resolver = createConfigurationResolver({
        typeRegistry: createTypeRegistryStub([
          { id: chatAgentTypeId, baseConfiguration: chatBase },
        ]),
        logger: loggerMock.create(),
      });

      expect(await resolver.resolveBase('ghost', ctx)).toBeUndefined();
      // ...while the merge path still applies the fallback.
      expect(
        await resolver.resolveConfig({ agentType: 'ghost', configuration: { tools: [] }, ctx })
      ).toEqual(expect.objectContaining({ ai_indices: ['elastic'] }));
    });
  });
});
