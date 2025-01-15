/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getCustomErrorClass,
  MLClusterClientUninitialized,
  MLUISettingsClientUninitialized,
  MLFieldFormatRegistryUninitialized,
} from './errors';

describe('Custom errors', () => {
  test('creates a custom error instance', () => {
    const MLCustomError = getCustomErrorClass('MLCustomError');
    const errorInstance = new MLCustomError('farequote is not defined');
    expect(errorInstance.message).toBe('farequote is not defined');
    expect(errorInstance.name).toBe('MLCustomError');
    expect(errorInstance).toBeInstanceOf(MLCustomError);
    // make sure that custom class extends Error
    expect(errorInstance).toBeInstanceOf(Error);
  });

  test('MLClusterClientUninitialized', () => {
    const errorInstance = new MLClusterClientUninitialized('cluster client is not initialized');
    expect(errorInstance.message).toBe('cluster client is not initialized');
    expect(errorInstance.name).toBe('MLClusterClientUninitialized');
    expect(errorInstance).toBeInstanceOf(MLClusterClientUninitialized);
  });

  test('MLUISettingsClientUninitialized', () => {
    const errorInstance = new MLUISettingsClientUninitialized('cluster client is not initialized');
    expect(errorInstance.message).toBe('cluster client is not initialized');
    expect(errorInstance.name).toBe('MLUISettingsClientUninitialized');
    expect(errorInstance).toBeInstanceOf(MLUISettingsClientUninitialized);
  });

  test('MLFieldFormatRegistryUninitialized', () => {
    const errorInstance = new MLFieldFormatRegistryUninitialized(
      'cluster client is not initialized'
    );
    expect(errorInstance.message).toBe('cluster client is not initialized');
    expect(errorInstance.name).toBe('MLFieldFormatRegistryUninitialized');
    expect(errorInstance).toBeInstanceOf(MLFieldFormatRegistryUninitialized);
  });
});
