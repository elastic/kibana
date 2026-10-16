/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createCompositionValidator, exampleNodes } from '@elastic/isomer-sdk';
import { runPrimitiveInventoryConformance } from '@elastic/isomer-sdk/testing';
import { agentBuilderPack } from './pack';

describe('agentBuilderPack', () => {
  const { primitives } = agentBuilderPack;

  it('publishes an example for every primitive', () => {
    expect(() => runPrimitiveInventoryConformance(primitives)).not.toThrow();
  });

  it.each(primitives.map((definition) => [definition.type, definition]))(
    'validates the examples of %s',
    (_type, definition) => {
      const validate = createCompositionValidator(primitives);

      for (const node of exampleNodes(definition)) {
        expect(validate({ type: 'view', body: [node] })).toMatchObject({ valid: true, errors: [] });
      }
    }
  );
});
