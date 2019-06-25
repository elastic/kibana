/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import toJson from 'enzyme-to-json';
import { mockAnomalies } from './mock';
import { cloneDeep } from 'lodash/fp';
import { shallow } from 'enzyme';
import { createInfluencers, createKeyAndValue } from './create_influencers';

describe('create_influencers', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<span>{createInfluencers(anomalies.anomalies[0])}</span>);
    expect(toJson(wrapper)).toMatchSnapshot();
  });

  test('it returns expected createKeyAndValue record with special left and right quotes', () => {
    const entities = createKeyAndValue({ 'name-1': 'value-1' });
    expect(entities).toEqual('name-1: “value-1”');
  });
});
