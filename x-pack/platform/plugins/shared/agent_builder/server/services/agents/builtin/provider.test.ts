/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { chatAgentTypeId } from '@kbn/agent-builder-common';
import type { BuiltInAgentDefinition } from '@kbn/agent-builder-server/agents';
import { toInternalDefinition } from './provider';
import { AgentAvailabilityCache } from './availability_cache';

describe('toInternalDefinition', () => {
  const convert = (definition: BuiltInAgentDefinition) => {
    return toInternalDefinition({
      definition,
      availabilityCache: new AgentAvailabilityCache(),
      configContext: { request: httpServerMock.createKibanaRequest(), spaceId: 'default' },
    });
  };

  const baseDefinition: BuiltInAgentDefinition = {
    id: 'test-agent',
    name: 'Test agent',
    description: 'desc',
    configuration: { tools: [] },
  };

  it('defaults the type to chat', async () => {
    const internal = await convert(baseDefinition);
    expect(internal.type).toBe(chatAgentTypeId);
  });

  it('passes a declared type through', async () => {
    const internal = await convert({ ...baseDefinition, type: 'investigation' });
    expect(internal.type).toBe('investigation');
  });

  describe('enable_elastic_capabilities defaulting', () => {
    it('defaults to true for chat agents when unset', async () => {
      const internal = await convert(baseDefinition);
      expect(internal.configuration.enable_elastic_capabilities).toBe(true);
    });

    it('respects an explicit value for chat agents', async () => {
      const internal = await convert({
        ...baseDefinition,
        configuration: { tools: [], enable_elastic_capabilities: false },
      });
      expect(internal.configuration.enable_elastic_capabilities).toBe(false);
    });

    it('leaves the flag unset for typed agents so the type base controls it', async () => {
      const internal = await convert({ ...baseDefinition, type: 'investigation' });
      expect(internal.configuration.enable_elastic_capabilities).toBeUndefined();
    });

    it('respects an explicit value for typed agents', async () => {
      const internal = await convert({
        ...baseDefinition,
        type: 'investigation',
        configuration: { tools: [], enable_elastic_capabilities: true },
      });
      expect(internal.configuration.enable_elastic_capabilities).toBe(true);
    });
  });
});
