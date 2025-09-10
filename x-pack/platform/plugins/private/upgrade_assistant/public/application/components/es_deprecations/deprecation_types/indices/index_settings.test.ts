/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Version } from '@kbn/upgrade-assistant-pkg-common';

import { getMockVersionInfo } from '../__fixtures__/version';

import { generateNewIndexName, sourceNameForIndex } from './index_settings';

const { currentMajor, prevMajor } = getMockVersionInfo();

const versionService = new Version();
versionService.setup('8.0.0');

describe('index settings', () => {
  describe('sourceNameForIndex', () => {
    beforeEach(() => {
      versionService.setup('8.0.0');
    });

    it('parses internal indices', () => {
      expect(sourceNameForIndex('.myInternalIndex', versionService)).toEqual('.myInternalIndex');
    });

    it('parses non-internal indices', () => {
      expect(sourceNameForIndex('myIndex', versionService)).toEqual('myIndex');
    });

    it(`replaces reindexed-v${prevMajor} with reindexed-v${currentMajor} in newIndexName`, () => {
      expect(sourceNameForIndex(`reindexed-v${prevMajor}-myIndex`, versionService)).toEqual(
        'myIndex'
      );
      expect(
        sourceNameForIndex(`.reindexed-v${prevMajor}-myInternalIndex`, versionService)
      ).toEqual('.myInternalIndex');
    });
  });

  describe('generateNewIndexName', () => {
    beforeEach(() => {
      versionService.setup('8.0.0');
    });

    it('parses internal indices', () => {
      expect(generateNewIndexName('.myInternalIndex', versionService)).toEqual(
        `.reindexed-v${currentMajor}-myInternalIndex`
      );
    });

    it('parses non-internal indices', () => {
      expect(generateNewIndexName('myIndex', versionService)).toEqual(
        `reindexed-v${currentMajor}-myIndex`
      );
    });

    it(`replaces reindexed-v${prevMajor} with reindexed-v${currentMajor} in generateNewIndexName`, () => {
      expect(generateNewIndexName(`reindexed-v${prevMajor}-myIndex`, versionService)).toEqual(
        `reindexed-v${currentMajor}-myIndex`
      );

      expect(
        generateNewIndexName(`.reindexed-v${prevMajor}-myInternalIndex`, versionService)
      ).toEqual(`.reindexed-v${currentMajor}-myInternalIndex`);
    });
  });
});
