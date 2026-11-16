/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BulkInstallPackagesFromRegistryRequestSchema,
  GetInfoRequestSchema,
  UpdatePackageRequestSchema,
} from './epm';

describe('UpdatePackageRequestSchema', () => {
  it('accepts a namespace_customization_settings entry with an ilm_policy', () => {
    UpdatePackageRequestSchema.body.validate({
      namespace_customization_settings: { production: { ilm_policy: 'my-policy' } },
    });
  });

  it('accepts an empty settings object for a namespace (clears managed settings)', () => {
    UpdatePackageRequestSchema.body.validate({
      namespace_customization_settings: { production: {} },
    });
  });

  it('rejects an empty string ilm_policy', () => {
    expect(() =>
      UpdatePackageRequestSchema.body.validate({
        namespace_customization_settings: { production: { ilm_policy: '' } },
      })
    ).toThrow();
  });

  it('accepts a namespace_customization_enabled_for entry within the length limit', () => {
    UpdatePackageRequestSchema.body.validate({
      namespace_customization_enabled_for: ['production'],
    });
  });

  it('rejects a namespace_customization_enabled_for entry longer than 100 characters', () => {
    expect(() =>
      UpdatePackageRequestSchema.body.validate({
        namespace_customization_enabled_for: ['a'.repeat(101)],
      })
    ).toThrow();
  });
});

describe('reporting mode string fields', () => {
  // These fields use the string helpers' warn() mode: overlong input is recorded in the
  // kibana.schema.string_length_violation.length histogram instead of being rejected.
  it('accepts an overlong pkgName', () => {
    expect(() =>
      GetInfoRequestSchema.params.validate({ pkgName: 'a'.repeat(1000), pkgVersion: '1.0.0' })
    ).not.toThrow();
  });

  it('accepts overlong package names in a bulk install', () => {
    expect(() =>
      BulkInstallPackagesFromRegistryRequestSchema.body.validate({
        packages: ['a'.repeat(1000), { name: 'b'.repeat(1000), version: '1.0.0' }],
      })
    ).not.toThrow();
  });
});
