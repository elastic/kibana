/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { authOptionsByDataSourceType } from './auth_options';

describe('auth_options', () => {
  describe('authOptionsByDataSourceType', () => {
    it('lists Federated Identity first for s3/gcs/azure', () => {
      const options = authOptionsByDataSourceType(true);
      expect(options.s3.map((o) => o.value)).toEqual([
        'federated_identity',
        'access_and_secret_keys',
        'anonymous',
      ]);
      expect(options.gcs.map((o) => o.value)).toEqual([
        'federated_identity',
        'access_and_secret_keys',
        'anonymous',
      ]);
      expect(options.azure.map((o) => o.value)).toEqual([
        'federated_identity',
        'credentials',
        'anonymous',
      ]);
    });

    it('omits Federated Identity when disabled', () => {
      const options = authOptionsByDataSourceType(false);
      expect(options.s3.map((o) => o.value)).toEqual(['access_and_secret_keys', 'anonymous']);
      expect(options.gcs.map((o) => o.value)).toEqual(['access_and_secret_keys', 'anonymous']);
      expect(options.azure.map((o) => o.value)).toEqual(['credentials', 'anonymous']);
    });

    it('does not accumulate Federated Identity across calls', () => {
      authOptionsByDataSourceType(true);
      authOptionsByDataSourceType(true);
      expect(authOptionsByDataSourceType(false).s3.map((o) => o.value)).toEqual([
        'access_and_secret_keys',
        'anonymous',
      ]);
    });

    it('marks only Federated Identity as recommended', () => {
      for (const options of Object.values(authOptionsByDataSourceType(true))) {
        expect(options.filter((o) => o.recommended).map((o) => o.value)).toEqual([
          'federated_identity',
        ]);
      }
    });

    it('gives every option a description', () => {
      for (const options of Object.values(authOptionsByDataSourceType(true))) {
        expect(options.every((o) => o.description.length > 0)).toBe(true);
      }
    });

    it('flags only anonymous as having no auth fields', () => {
      for (const options of Object.values(authOptionsByDataSourceType(true))) {
        expect(options.filter((o) => !o.hasAuthFields).map((o) => o.value)).toEqual(['anonymous']);
      }
    });
  });
});
