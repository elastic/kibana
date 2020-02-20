/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CURRENT_MAJOR_VERSION, PREV_MAJOR_VERSION } from '../../../../common/version';
import {
  generateNewIndexName,
  getReindexWarnings,
  sourceNameForIndex,
  transformFlatSettings,
} from './index_settings';

describe('transformFlatSettings', () => {
  it('does not blow up for empty mappings', () => {
    expect(
      transformFlatSettings({
        settings: {},
        mappings: {},
      })
    ).toEqual({
      settings: {},
      mappings: {},
    });
  });

  it('removes settings that cannot be set on a new index', () => {
    expect(
      transformFlatSettings({
        settings: {
          // Settings that should get preserved
          'index.number_of_replicas': '1',
          'index.number_of_shards': '5',
          // Blacklisted settings
          'index.uuid': 'i66b9149a-00ee-42d9-8ca1-85ae927924bf',
          'index.blocks.write': 'true',
          'index.creation_date': '1547052614626',
          'index.legacy': '6',
          'index.mapping.single_type': 'true',
          'index.provided_name': 'test1',
          'index.routing.allocation.initial_recovery._id': '1',
          'index.version.created': '123123',
          'index.version.upgraded': '123123',
        },
        mappings: {},
      })
    ).toEqual({
      settings: {
        'index.number_of_replicas': '1',
        'index.number_of_shards': '5',
      },
      mappings: {},
    });
  });
});

describe('sourceNameForIndex', () => {
  it('parses internal indices', () => {
    expect(sourceNameForIndex('.myInternalIndex')).toEqual('.myInternalIndex');
  });

  it('parses non-internal indices', () => {
    expect(sourceNameForIndex('myIndex')).toEqual('myIndex');
  });

  it('excludes appended v5 reindexing string from newIndexName', () => {
    expect(sourceNameForIndex('myIndex-reindexed-v5')).toEqual('myIndex');
    expect(sourceNameForIndex('.myInternalIndex-reindexed-v5')).toEqual('.myInternalIndex');
  });

  it('replaces reindexed-v${PREV_MAJOR_VERSION} with reindexed-v${CURRENT_MAJOR_VERSION} in newIndexName', () => {
    expect(sourceNameForIndex(`reindexed-v${PREV_MAJOR_VERSION}-myIndex`)).toEqual('myIndex');
    expect(sourceNameForIndex(`.reindexed-v${PREV_MAJOR_VERSION}-myInternalIndex`)).toEqual(
      '.myInternalIndex'
    );
  });
});

describe('generateNewIndexName', () => {
  it('parses internal indices', () => {
    expect(generateNewIndexName('.myInternalIndex')).toEqual(
      `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`
    );
  });

  it('parses non-internal indices', () => {
    expect(generateNewIndexName('myIndex')).toEqual(`reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`);
  });

  it('excludes appended v5 reindexing string from generateNewIndexName', () => {
    expect(generateNewIndexName('myIndex-reindexed-v5')).toEqual(
      `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`
    );

    expect(generateNewIndexName('.myInternalIndex-reindexed-v5')).toEqual(
      `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`
    );
  });

  it('replaces reindexed-v${PREV_MAJOR_VERSION} with reindexed-v${CURRENT_MAJOR_VERSION} in generateNewIndexName', () => {
    expect(generateNewIndexName(`reindexed-v${PREV_MAJOR_VERSION}-myIndex`)).toEqual(
      `reindexed-v${CURRENT_MAJOR_VERSION}-myIndex`
    );

    expect(generateNewIndexName(`.reindexed-v${PREV_MAJOR_VERSION}-myInternalIndex`)).toEqual(
      `.reindexed-v${CURRENT_MAJOR_VERSION}-myInternalIndex`
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
