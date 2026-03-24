/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formDeserializer, formSerializer } from './form_serialization';

describe('formSerializer', () => {
  it('should correctly serialize form data with headers', () => {
    const formData = {
      actionTypeId: '.connector-test',
      isDeprecated: false,
      __internal__: {
        headers: [
          { key: 'header1', value: 'foo', type: 'config' },
          { key: 'header2', value: 'bar', type: 'config' },
          { key: 'header3', value: 'secret-value', type: 'secret' },
        ],
        hasProxy: false,
      },
      config: {},
      secrets: {},
      isMissingSecrets: false,
    };

    expect(formSerializer(formData)).toEqual({
      __internal__: formData.__internal__,
      actionTypeId: '.connector-test',
      config: {
        headers: {
          header1: 'foo',
          header2: 'bar',
        },
        proxyUrl: null,
        proxyVerificationMode: undefined,
        hasProxyAuth: false,
      },
      isDeprecated: false,
      isMissingSecrets: false,
      secrets: {
        secretHeaders: {
          header3: 'secret-value',
        },
        proxyUsername: null,
        proxyPassword: null,
      },
    });
  });

  it('should set headers to null and secretHeaders to undefined when empty', () => {
    const formData = {
      actionTypeId: '.connector-test',
      isDeprecated: false,
      __internal__: {
        headers: [],
        hasProxy: false,
      },
      config: {},
      secrets: {},
      isMissingSecrets: false,
    };

    expect(formSerializer(formData)).toEqual(
      expect.objectContaining({
        config: expect.objectContaining({
          headers: null,
        }),
        secrets: expect.objectContaining({
          secretHeaders: undefined,
        }),
      })
    );
  });
});

describe('formDeserializer', () => {
  it('should correctly deserialize data', () => {
    const data = {
      actionTypeId: '.connector-test',
      isDeprecated: false,
      config: {
        headers: {
          foo: 'bar',
          an: 'tonio',
        },
      },
      secrets: {},
      isMissingSecrets: false,
    };

    expect(formDeserializer(data)).toEqual({
      actionTypeId: '.connector-test',
      config: {
        headers: [
          { key: 'foo', type: 'config', value: 'bar' },
          { key: 'an', type: 'config', value: 'tonio' },
        ],
      },
      __internal__: {
        headers: [
          { key: 'foo', type: 'config', value: 'bar' },
          { key: 'an', type: 'config', value: 'tonio' },
        ],
        hasProxy: false,
      },
      isDeprecated: false,
      isMissingSecrets: false,
      secrets: {},
    });
  });

  it('should return data unchanged when actionTypeId is not set', () => {
    const data = {
      isDeprecated: false,
      config: { headers: { foo: 'bar' } },
      secrets: {},
      isMissingSecrets: false,
    };

    expect(formDeserializer(data as any)).toBe(data);
  });
});
