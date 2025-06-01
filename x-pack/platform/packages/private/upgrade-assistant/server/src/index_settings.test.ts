/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Version } from './version';
import { SemVer } from 'semver';

const kibanaVersion = new SemVer('8.0.0');

import { getReindexWarnings } from '@kbn/upgrade-assistant-server';

describe('index settings', () => {
  describe('getReindexWarnings', () => {
    it('does not blow up for empty mappings', () => {
      expect(
        getReindexWarnings(
          {
            settings: {},
            mappings: {},
          },
          { getMajorVersion: () => kibanaVersion } as unknown as Version
        )
      ).toEqual([]);
    });
  });
});
