/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { registeredViewIds } from '../../common/constants';
import { createAdaptiveUiViewRegistry, significantEventSpec } from '.';

describe('createAdaptiveUiViewRegistry', () => {
  it('registers the significant event view', () => {
    const registry = createAdaptiveUiViewRegistry();
    expect(registry.get(registeredViewIds.significantEvent)).toBeDefined();
    expect(registry.list().map((view) => view.id)).toContain(registeredViewIds.significantEvent);
  });

  it('builds the curated default spec for the registered view', async () => {
    const registry = createAdaptiveUiViewRegistry();
    const response = await registry.request(registeredViewIds.significantEvent, undefined);
    expect(response.validation.valid).toBe(true);
    expect(response.spec).toEqual(significantEventSpec);
  });

  it('applies input overrides through the registry', async () => {
    const registry = createAdaptiveUiViewRegistry();
    const response = await registry.request(registeredViewIds.significantEvent, undefined, {
      title: 'Custom incident',
    });
    expect(response.validation.valid).toBe(true);
    expect(response.spec.title).toBe('Custom incident');
  });
});
