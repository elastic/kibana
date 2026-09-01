/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import {
  getRunQuotaSavedObjectTypes,
  RUN_QUOTA_LEDGER_SO_TYPE,
  RUN_QUOTA_SETTINGS_SO_TYPE,
} from './saved_objects';

const savedObjectTypes = new Map(
  getRunQuotaSavedObjectTypes().map((savedObjectType) => [savedObjectType.name, savedObjectType])
);

const getSchemas = (type: string) => {
  const modelVersions = savedObjectTypes.get(type)?.modelVersions;
  if (!modelVersions || typeof modelVersions === 'function') {
    throw new Error(`Saved object type ${type} has no static model versions`);
  }
  const modelVersion = modelVersions['1'];
  return {
    create: modelVersion?.schemas?.create as ObjectType,
    forwardCompatibility: modelVersion?.schemas?.forwardCompatibility as ObjectType,
  };
};

const settingsAttributes = {
  timezone: 'UTC',
  limits: {
    detection: { enabled: true, max: 100 },
    future_group: { enabled: true, max: 7 },
  },
  enforcementEnabled: false,
  futureTopLevel: { retained: true },
};

const ledgerAttributes = {
  date: '2026-08-31',
  group: 'future_group',
  count: 0,
  withinLimitGrantCount: 0,
  criticalPastLimitGrantCount: 0,
  allowedGrantKeys: [],
  deniedGrantKeys: [],
  decisions: [],
  skipped: [],
  totalSkipped: 0,
  decisionsEvicted: false,
  futureTopLevel: { retained: true },
};

describe('run quota saved object types', () => {
  it('registers every type as hidden and namespace agnostic', () => {
    expect([...savedObjectTypes.values()]).toHaveLength(2);
    for (const savedObjectType of savedObjectTypes.values()) {
      expect(savedObjectType.hidden).toBe(true);
      expect(savedObjectType.namespaceType).toBe('agnostic');
    }
  });

  it.each([
    [RUN_QUOTA_SETTINGS_SO_TYPE, settingsAttributes],
    [RUN_QUOTA_LEDGER_SO_TYPE, ledgerAttributes],
  ])('accepts unknown fields in both schemas for %s', (type, attributes) => {
    const schemas = getSchemas(type);

    expect(() => schemas.create.validate(attributes)).not.toThrow();
    expect(() => schemas.forwardCompatibility.validate(attributes)).not.toThrow();
  });

  it('accepts the canonical disabled limit and rejects a positive disabled maximum', () => {
    const { create } = getSchemas(RUN_QUOTA_SETTINGS_SO_TYPE);

    expect(() =>
      create.validate({
        ...settingsAttributes,
        limits: { detection: { enabled: false, max: 0 } },
      })
    ).not.toThrow();
    expect(() =>
      create.validate({
        ...settingsAttributes,
        limits: { detection: { enabled: false, max: 1 } },
      })
    ).toThrow();
  });
});
