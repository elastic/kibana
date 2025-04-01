/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { versionService } from '../version';
import { getMockVersionInfo } from '../__fixtures__/version';

import { generateNewIndexName, getReindexWarnings, sourceNameForIndex } from './index_settings';

const { currentMajor, prevMajor } = getMockVersionInfo();

describe('index settings', () => {
  describe('sourceNameForIndex', () => {
    beforeEach(() => {
      versionService.setup('8.0.0');
    });

    it('parses internal indices', () => {
      expect(sourceNameForIndex('.myInternalIndex')).toEqual('.myInternalIndex');
    });

    it('parses non-internal indices', () => {
      expect(sourceNameForIndex('myIndex')).toEqual('myIndex');
    });

    it(`replaces reindexed-v${prevMajor} with reindexed-v${currentMajor} in newIndexName`, () => {
      expect(sourceNameForIndex(`reindexed-v${prevMajor}-myIndex`)).toEqual('myIndex');
      expect(sourceNameForIndex(`.reindexed-v${prevMajor}-myInternalIndex`)).toEqual(
        '.myInternalIndex'
      );
    });
  });

  describe('generateNewIndexName', () => {
    beforeEach(() => {
      versionService.setup('8.0.0');
    });

    it('parses internal indices', () => {
      expect(generateNewIndexName('.myInternalIndex')).toEqual(
        `.reindexed-v${currentMajor}-myInternalIndex`
      );
    });

    it('parses non-internal indices', () => {
      expect(generateNewIndexName('myIndex')).toEqual(`reindexed-v${currentMajor}-myIndex`);
    });

    it(`replaces reindexed-v${prevMajor} with reindexed-v${currentMajor} in generateNewIndexName`, () => {
      expect(generateNewIndexName(`reindexed-v${prevMajor}-myIndex`)).toEqual(
        `reindexed-v${currentMajor}-myIndex`
      );

      expect(generateNewIndexName(`.reindexed-v${prevMajor}-myInternalIndex`)).toEqual(
        `.reindexed-v${currentMajor}-myInternalIndex`
      );
    });
  });

  describe('getReindexWarnings', () => {
    it('does not blow up for empty mappings', () => {
      expect(
        getReindexWarnings({
          settings: {},
          mappings: {},
        })
      ).toEqual([]);
    });
  });
});
