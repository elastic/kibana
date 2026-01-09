/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formSerializer, formDeserializer } from './form_serialization';

describe('formDeserializer', () => {
  it('should correctly deserialize data', () => {
    const data = {
      actionTypeId: '.gen-ai',
      isDeprecated: false,
      config: {
        headers: {
          foo: 'bar',
          an: 'tonio',
        },
      },
      secrets: {
        secretHeaders: {
          not: 'relevant',
        },
      },
      isMissingSecrets: false,
    };

    expect(formDeserializer(data)).toEqual({
      actionTypeId: '.gen-ai',
      config: {
        headers: [
          {
            key: 'foo',
            type: 'config',
            value: 'bar',
          },
          {
            key: 'an',
            type: 'config',
            value: 'tonio',
          },
        ],
      },
      __internal__: {
        headers: [
          {
            key: 'foo',
            type: 'config',
            value: 'bar',
          },
          {
            key: 'an',
            type: 'config',
            value: 'tonio',
          },
        ],
      },
      isDeprecated: false,
      isMissingSecrets: false,
      secrets: {
        secretHeaders: {
          not: 'relevant',
        },
      },
    });
  });
});

describe('formSerializer', () => {
  it('should correctly serialize form data', () => {
    const formData = {
      actionTypeId: '.gen-ai',
      isDeprecated: false,
      config: {
        headers: [
          { key: 'foo', value: 'bar' },
          { key: 'an', value: 'tonio' },
        ],
      },
      secrets: {
        secretHeaders: [
          {
            key: 'foo',
            value: 'bar',
          },
        ],
      },
      isMissingSecrets: false,
    };

    expect(formSerializer(formData)).toEqual({
      actionTypeId: '.gen-ai',
      config: {
        headers: {
          foo: 'bar',
          an: 'tonio',
        },
      },
      isDeprecated: false,
      isMissingSecrets: false,
      secrets: {},
    });
  });

  it('should correctly serialize form data without config headers', () => {
    const formData = {
      actionTypeId: '.gen-ai',
      isDeprecated: false,
      config: {},
      secrets: {
        secretHeaders: [
          {
            key: 'foo',
            value: 'bar',
          },
        ],
      },
      isMissingSecrets: false,
    };

    expect(formSerializer(formData)).toEqual({
      actionTypeId: '.gen-ai',
      config: {},
      isDeprecated: false,
      isMissingSecrets: false,
      secrets: {},
    });
  });
});
