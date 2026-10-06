/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { EntityDefinitionRegistry, type RegistrableEntityDefinition } from '.';
import { createEntityDefinitionsClient } from './entity_definitions_client';

const makeDefinition = (type: string): RegistrableEntityDefinition => ({
  type,
  name: `Test '${type}' definition`,
  fields: [],
  identityField: { singleField: `${type}.name` },
  indexPatterns: ['logs-*'],
  managedBy: { kind: 'plugin', id: 'testPlugin' },
});

describe('createEntityDefinitionsClient', () => {
  let registry: EntityDefinitionRegistry;

  beforeEach(() => {
    registry = new EntityDefinitionRegistry(loggerMock.create());
    registry.register(makeDefinition('k8s.pod'));
    registry.register(makeDefinition('k8s.node'));
  });

  it('keeps the namespace it was created for', () => {
    expect(createEntityDefinitionsClient(registry, 'space-a').namespace).toBe('space-a');
  });

  it('delegates get and list to the registry', async () => {
    const client = createEntityDefinitionsClient(registry, 'default');

    await expect(client.get('k8s.pod')).resolves.toBe(registry.get('k8s.pod'));
    await expect(client.get('unknown')).resolves.toBeUndefined();
    expect((await client.list()).map(({ type }) => type)).toEqual(['k8s.pod', 'k8s.node']);
  });

  it('reflects registrations made after the client was created', async () => {
    const client = createEntityDefinitionsClient(registry, 'default');
    registry.register(makeDefinition('aws.s3_bucket'));

    await expect(client.get('aws.s3_bucket')).resolves.toBeDefined();
  });
});
