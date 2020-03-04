/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
jest.mock('ui/new_platform');

import { ESSearchSource } from './es_search_source';
import { VectorLayer } from '../../vector_layer';
import { ES_SEARCH } from '../../../../common/constants';
import { ESSearchSourceDescriptor } from '../../../../common/descriptor_types';

const descriptor: ESSearchSourceDescriptor = {
  type: ES_SEARCH,
  id: '1234',
  indexPatternId: 'myIndexPattern',
  geoField: 'myLocation',
};

describe('ES Search Source', () => {
  it('should create a vector layer', () => {
    const source = new ESSearchSource(descriptor, null);
    const layer = source.createDefaultLayer();
    expect(layer instanceof VectorLayer).toEqual(true);
  });
});
