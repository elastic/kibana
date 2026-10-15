/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildEntityListSourceFilter } from './entity_list_source';

describe('entity_list_source', () => {
  describe('buildEntityListSourceFilter', () => {
    it('returns full source when no includes are provided', () => {
      expect(buildEntityListSourceFilter({})).toEqual({});
    });

    it('returns an _source include list when sourceIncludes is provided', () => {
      expect(
        buildEntityListSourceFilter({
          sourceIncludes: ['entity.id', 'entity.risk'],
        })
      ).toEqual({
        _source: ['entity.id', 'entity.risk'],
      });
    });

    it('ignores an empty includes list', () => {
      expect(buildEntityListSourceFilter({ sourceIncludes: [] })).toEqual({});
    });
  });
});
