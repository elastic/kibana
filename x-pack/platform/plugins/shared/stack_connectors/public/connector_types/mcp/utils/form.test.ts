/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { mergeSecretHeaders } from './form';
import { HeaderFieldType } from '../types';

describe('mergeSecretHeaders', () => {
  it('should merge secret header keys with existing headers', () => {
    const formData: FormData = {
      __internal__: {
        headers: [{ key: 'config-key', value: 'value', type: HeaderFieldType.CONFIG }],
      },
    };

    expect(mergeSecretHeaders(['secret-key'], formData)).toEqual([
      { key: 'config-key', value: 'value', type: HeaderFieldType.CONFIG },
      { key: 'secret-key', value: '', type: HeaderFieldType.SECRET },
    ]);
  });

  it('should return only secret headers when no existing headers', () => {
    const formData: FormData = {};

    expect(mergeSecretHeaders(['secret-key'], formData)).toEqual([
      { key: 'secret-key', value: '', type: HeaderFieldType.SECRET },
    ]);
  });
});
