/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formSerializer } from './form_serialization';

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
      secrets: {
        secretHeaders: undefined,
      },
    });
  });
});
