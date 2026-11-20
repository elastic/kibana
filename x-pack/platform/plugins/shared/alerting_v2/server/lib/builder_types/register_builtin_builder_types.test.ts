/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BuilderTypeRegistry } from './builder_type_registry';
import {
  SEQUENCE_BUILDER_TYPE,
  THRESHOLD_BUILDER_TYPE,
  registerBuiltinBuilderTypes,
} from './register_builtin_builder_types';

describe('registerBuiltinBuilderTypes', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    registry = new BuilderTypeRegistry();
    registerBuiltinBuilderTypes(registry);
  });

  it('registers the threshold builder', () => {
    expect(registry.get(THRESHOLD_BUILDER_TYPE)).toEqual({ type: THRESHOLD_BUILDER_TYPE });
  });

  it('registers the sequence builder', () => {
    expect(registry.get(SEQUENCE_BUILDER_TYPE)).toEqual({ type: SEQUENCE_BUILDER_TYPE });
  });

  it('prevents a plugin from re-registering a built-in type', () => {
    expect(() => registry.register({ type: THRESHOLD_BUILDER_TYPE })).toThrow(/already registered/);
  });

  it('throws when applied twice to the same registry', () => {
    expect(() => registerBuiltinBuilderTypes(registry)).toThrow(/already registered/);
  });
});
