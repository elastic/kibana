/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdatePackageRequestSchema, GetFileRequestSchema } from './epm';

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

describe('schema field length limits', () => {
  it('rejects a pkgName over 255 characters', () => {
    expect(() =>
      GetFileRequestSchema.params.validate({
        pkgName: 'a'.repeat(256),
        pkgVersion: '1.0.0',
        filePath: '/path/to/file',
      })
    ).toThrow();
  });

  it('rejects a pkgVersion over 512 characters', () => {
    expect(() =>
      GetFileRequestSchema.params.validate({
        pkgName: 'my-package',
        pkgVersion: 'a'.repeat(513),
        filePath: '/path/to/file',
      })
    ).toThrow();
  });
});
