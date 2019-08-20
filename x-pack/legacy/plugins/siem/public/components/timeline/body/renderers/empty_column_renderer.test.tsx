/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { TimelineNonEcsData } from '../../../../graphql/types';
import { defaultHeaders, mockTimelineData, TestProviders } from '../../../../mock';
import { getEmptyValue } from '../../../empty_value';
import { deleteItemIdx, findItem } from './helpers';
import { emptyColumnRenderer } from './empty_column_renderer';

describe('empty_column_renderer', () => {
  let mockDatum: TimelineNonEcsData[];
  const _id = mockTimelineData[0]._id;
  beforeEach(() => {
    mockDatum = cloneDeep(mockTimelineData[0].data);
  });

  test('renders correctly against snapshot', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    const sourceObj = mockDatum.find(d => d.field === 'source.ip');
    const emptyColumn = emptyColumnRenderer.renderColumn({
      columnName: 'source.ip',
      eventId: _id,
      values: sourceObj != null ? sourceObj.value : undefined,
      field: defaultHeaders.find(h => h.id === 'source.ip')!,
    });
    const wrapper = shallow(<span>{emptyColumn}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('should return isInstance true if source is empty', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    expect(emptyColumnRenderer.isInstance('source', mockDatum)).toBe(true);
  });

  test('should return isInstance true if source.ip is empty', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    expect(emptyColumnRenderer.isInstance('source.ip', mockDatum)).toBe(true);
  });

  test('should return isInstance false if source.ip is NOT empty', () => {
    expect(emptyColumnRenderer.isInstance('source.ip', mockDatum)).toBe(false);
  });

  test('should return isInstance true if it encounters a column it does not know about', () => {
    expect(emptyColumnRenderer.isInstance('made up name', mockDatum)).toBe(true);
  });

  test('should return an empty value', () => {
    mockDatum = deleteItemIdx(mockDatum, findItem(mockDatum, 'source.ip'));
    const emptyColumn = emptyColumnRenderer.renderColumn({
      columnName: 'source.ip',
      eventId: _id,
      values: null,
      field: defaultHeaders.find(h => h.id === 'source.ip')!,
    });
    const wrapper = mount(
      <TestProviders>
        <span>{emptyColumn}</span>
      </TestProviders>
    );

    expect(wrapper.text()).toEqual(getEmptyValue());
  });
});
