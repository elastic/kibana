/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGte from 'semver/functions/gte';
import { embeddableMigrations } from './embeddable_migrations';
import { savedObjectMigrations } from '../saved_objects/saved_object_migrations';

describe('saved object migrations and embeddable migrations', () => {
  test('should have same versions registered (>7.12)', () => {
    const savedObjectMigrationVersions = Object.keys(savedObjectMigrations).filter((version) => {
      return semverGte(version, '7.13.0');
    });
    const embeddableMigrationVersions = Object.keys(embeddableMigrations).filter((key) => {
      // filter out embeddable only migration keys
      return !['8.0.1'].includes(key);
    });
    expect(savedObjectMigrationVersions.sort()).toEqual(embeddableMigrationVersions.sort());
  });
});
