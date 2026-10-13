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

  it('adds the ownership mappings', () => {
    expect(v6.changes).toEqual([
      {
        type: 'mappings_addition',
        addedMappings: {
          createdById: { type: 'keyword', ignore_above: 1024 },
          createdByApiKeyId: { type: 'keyword', ignore_above: 1024 },
        },
      },
    ]);
  });

  it('accepts createdById on create', () => {
    expect(() =>
      asObjectSchema(v6Schemas.create).validate({
        ...baseAttributes,
        createdById: ['realm:["file","default_file","rshared"]'],
      })
    ).not.toThrow();
  });

  it('accepts createdByApiKeyId on create', () => {
    expect(() =>
      asObjectSchema(v6Schemas.create).validate({ ...baseAttributes, createdByApiKeyId: 'key-1' })
    ).not.toThrow();
  });

  it.each(['create', 'forwardCompatibility'] as const)(
    'allows up to three ownership IDs in the %s schema',
    (schemaName) => {
      const ownershipSchema = asObjectSchema(v6Schemas[schemaName]);
      const createdById = [
        'request-profile',
        'owner-profile',
        'realm:["native","default_native","rshared"]',
      ];

      expect(ownershipSchema.validate({ ...baseAttributes, createdById }).createdById).toEqual(
        createdById
      );
      expect(() =>
        ownershipSchema.validate({
          ...baseAttributes,
          createdById: [...createdById, 'unexpected-id'],
        })
      ).toThrow(/createdById/);
    }
  );

  it('accepts documents with neither ownership id (legacy)', () => {
    expect(() => asObjectSchema(v6Schemas.create).validate(baseAttributes)).not.toThrow();
  });

  it('round-trips createdById through forwardCompatibility', () => {
    const result = asObjectSchema(v6Schemas.forwardCompatibility).validate({
      ...baseAttributes,
      createdById: ['realm:["file","default_file","rshared"]'],
      someFutureField: 'ignored',
    });
    expect(result.createdById).toEqual(['realm:["file","default_file","rshared"]']);
  });
});

describe('scheduledReportModelVersions v5 forwardCompatibility (ZDT rollback)', () => {
  it('omits createdById from the v5 view of a newer document', () => {
    const v5Schemas = scheduledReportModelVersions['5']!.schemas!;
    const result = asObjectSchema(v5Schemas.forwardCompatibility).validate({
      ...baseAttributes,
      createdById: ['realm:["file","default_file","rshared"]'],
    });
    expect(result).not.toHaveProperty('createdById');
  });
});
