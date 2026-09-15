/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import { scheduledReportModelVersions } from './model_versions';

const asObjectSchema = (schema: unknown) => schema as ObjectType;

const baseAttributes = {
  createdAt: '2025-05-06T21:10:17.137Z',
  createdBy: 'rshared',
  enabled: true,
  jobType: 'printable_pdf_v2',
  meta: { objectType: 'dashboard' },
  payload: '{}',
  schedule: { rrule: { freq: 3, interval: 1, tzid: 'UTC' } },
  title: 'a title',
};

describe('scheduledReportModelVersions v6', () => {
  const v6 = scheduledReportModelVersions['6']!;
  const v6Schemas = v6.schemas!;

  it('adds the createdById mapping', () => {
    expect(v6.changes).toEqual([
      {
        type: 'mappings_addition',
        addedMappings: { createdById: { type: 'keyword', ignore_above: 1024 } },
      },
    ]);
  });

  it('accepts createdById on create', () => {
    expect(() =>
      asObjectSchema(v6Schemas.create).validate({
        ...baseAttributes,
        createdById: 'realm:["file","default_file","rshared"]',
      })
    ).not.toThrow();
  });

  it('accepts documents with no createdById (legacy)', () => {
    expect(() => asObjectSchema(v6Schemas.create).validate(baseAttributes)).not.toThrow();
  });

  it('round-trips createdById through forwardCompatibility', () => {
    const result = asObjectSchema(v6Schemas.forwardCompatibility).validate({
      ...baseAttributes,
      createdById: 'realm:["file","default_file","rshared"]',
      someFutureField: 'ignored',
    });
    expect(result.createdById).toBe('realm:["file","default_file","rshared"]');
  });
});

describe('scheduledReportModelVersions v5 forwardCompatibility (ZDT rollback)', () => {
  it('drops createdById as an unknown field, without erasing it from the stored document', () => {
    const v5Schemas = scheduledReportModelVersions['5']!.schemas!;
    const result = asObjectSchema(v5Schemas.forwardCompatibility).validate({
      ...baseAttributes,
      createdById: 'realm:["file","default_file","rshared"]',
    });
    // A node running the older (v5) model version ignores `createdById` on read; it never
    // writes back a full-attribute overwrite, so the field survives a rolling downgrade.
    expect(result).not.toHaveProperty('createdById');
  });
});
