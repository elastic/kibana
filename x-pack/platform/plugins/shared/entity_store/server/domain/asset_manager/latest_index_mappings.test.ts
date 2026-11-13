/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LATEST_INDEX_MAPPINGS_VERSION } from '../../../common/domain/entity_index';
import { getLatestIndexMappingProperties } from './latest_index_mappings';

describe('getLatestIndexMappingProperties', () => {
  it("please bump 'LATEST_INDEX_MAPPINGS_VERSION' when the latest index mappings change", () => {
    expect(LATEST_INDEX_MAPPINGS_VERSION).toEqual(1);
    // The version sits in the snapshot too, so a change of the properties shows an unchanged version in the diff.
    expect({
      version: LATEST_INDEX_MAPPINGS_VERSION,
      properties: getLatestIndexMappingProperties('default'),
    }).toMatchSnapshot();
  });

  it('stores user.entity.id as a keyword', () => {
    expect(getLatestIndexMappingProperties('default')['user.entity.id']).toEqual({
      type: 'keyword',
    });
  });
});
