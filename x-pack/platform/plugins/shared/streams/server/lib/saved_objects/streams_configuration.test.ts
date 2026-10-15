/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';
import { streamsConfigurationSavedObjectType } from './streams_configuration';

const modelVersion2 = () => {
  const { modelVersions } = streamsConfigurationSavedObjectType;
  const versions = typeof modelVersions === 'function' ? modelVersions() : modelVersions;
  return versions?.['2'];
};

describe('streams-configuration model versions', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    // The test migrator does not terminate when asked for a version the type lacks, so fail first.
    expect(modelVersion2()).toBeDefined();
    migrator = createModelVersionTestMigrator({ type: streamsConfigurationSavedObjectType });
  });

  const v1Attributes = { unit_id: 'default', unit: { sources: [] }, secrets: 'encrypted' };
  const sealed = [
    { name: 'es-prod', target: 'dev', ciphertext: `v1.kid-1.oKGio6Slpqeoqaqr.${'A'.repeat(22)}` },
  ];

  const createSchemaV2 = () => {
    const create = modelVersion2()?.schemas?.create;
    // Without this the optional chain would let the tests pass when version 2 is missing.
    expect(create).toBeDefined();
    return create as NonNullable<typeof create>;
  };

  it('upgrades a v1 document without adding a cache', () => {
    const migrated = migrator.migrate({
      document: {
        id: 'default',
        type: 'streams-configuration',
        attributes: v1Attributes,
        references: [],
      },
      fromVersion: 1,
      toVersion: 2,
    });

    expect(migrated.attributes).toEqual(v1Attributes);
  });

  it('drops the cache when downgrading to v1', () => {
    const migrated = migrator.migrate({
      document: {
        id: 'default',
        type: 'streams-configuration',
        attributes: { ...v1Attributes, sealed_credentials: sealed },
        references: [],
      },
      fromVersion: 2,
      toVersion: 1,
    });

    expect(migrated.attributes).toEqual(v1Attributes);
  });

  it('accepts a cache on create in v2', () => {
    expect(() =>
      createSchemaV2().validate({ ...v1Attributes, sealed_credentials: sealed })
    ).not.toThrow();
  });

  it.each([
    ['legacy base64', 'oKGio6Slpqeoqaqrg2tRQjC/L94='],
    ['short IV and tag', 'v1.kid-1.AAAA.BBBB'],
    ['a 25 char ct that Go cannot decode', `v1.kid-1.oKGio6Slpqeoqaqr.${'A'.repeat(25)}`],
    ['a ct with non-zero trailing bits', `v1.kid-1.oKGio6Slpqeoqaqr.${'A'.repeat(21)}B`],
  ])('rejects a cached ciphertext in %s form on create', (_, ciphertext) => {
    expect(() =>
      createSchemaV2().validate({
        ...v1Attributes,
        sealed_credentials: [{ name: 'es-prod', target: 'dev', ciphertext }],
      })
    ).toThrow();
  });
});
