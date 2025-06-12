/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinition, builtInEntityDefinition } from '../helpers/fixtures';
import { generateLatestProcessors } from './generate_latest_processors';
import { entityDefinitionSchema } from '@kbn/entities-schema';

describe('generateLatestProcessors(definition)', () => {
  it('should generate a valid pipeline for custom definition', () => {
    const processors = generateLatestProcessors(entityDefinition);
    expect(processors).toMatchSnapshot();
  });

  it('should generate a valid pipeline for builtin definition', () => {
    const processors = generateLatestProcessors(builtInEntityDefinition);
    expect(processors).toMatchSnapshot();
  });

  it('should set entity.type to Identity for User entity store', () => {
    const userEntityDefinition = entityDefinitionSchema.parse({
      id: 'test-user-entity',
      version: '1.0.0',
      name: 'Test User Entity',
      type: 'user',
      indexPatterns: ['test-user-*'],
      identityFields: [{ field: 'user.name', optional: false }],
      displayNameTemplate: '{{user.name}}',
      latest: {
        timestampField: '@timestamp',
      },
    });

    const processors = generateLatestProcessors(userEntityDefinition);

    // Find the entity.type processor
    const entityTypeProcessor = processors.find(
      (processor) => processor.set?.field === 'entity.type'
    );

    expect(entityTypeProcessor).toBeDefined();

    expect(entityTypeProcessor?.set?.value).toBe('Identity');
  });

  it('should set entity.type to Host for Host entity store', () => {
    const hostEntityDefinition = entityDefinitionSchema.parse({
      id: 'test-host-entity',
      version: '1.0.0',
      name: 'Test Host Entity',
      type: 'host',
      indexPatterns: ['test-host-*'],
      identityFields: [{ field: 'host.name', optional: false }],
      displayNameTemplate: '{{host.name}}',
      latest: {
        timestampField: '@timestamp',
      },
    });

    const processors = generateLatestProcessors(hostEntityDefinition);

    // Find the entity.type processor
    const entityTypeProcessor = processors.find(
      (processor) => processor.set?.field === 'entity.type'
    );

    expect(entityTypeProcessor).toBeDefined();

    expect(entityTypeProcessor?.set?.value).toBe('Host');
  });

  it('should not set entity.type for other entity stores', () => {
    // Using the existing service entity definition
    const processors = generateLatestProcessors(entityDefinition);

    // Check that no entity.type processor exists
    const entityTypeProcessor = processors.find(
      (processor) => processor.set?.field === 'entity.type'
    );

    expect(entityTypeProcessor).toBeUndefined();
  });
});
