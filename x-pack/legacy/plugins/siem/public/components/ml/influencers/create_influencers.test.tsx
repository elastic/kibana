/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { shallow, mount } from 'enzyme';
import { createInfluencers, createKeyAndValue } from './create_influencers';

describe('create_influencers', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(<span>{createInfluencers(anomalies.anomalies[0].influencers)}</span>);
    expect(wrapper).toMatchSnapshot();
  });

  test('it returns an empty string when influencers is undefined', () => {
    const wrapper = mount(<span>{createInfluencers()}</span>);
    expect(wrapper.text()).toEqual('');
  });

  test('it returns expected createKeyAndValue record with special left and right quotes', () => {
    const entities = createKeyAndValue({ 'name-1': 'value-1' });
    expect(entities).toEqual('name-1: "value-1"');
  });

  test('it returns expected createKeyAndValue record when empty object is passed', () => {
    const entities = createKeyAndValue({});
    expect(entities).toEqual('');
  });

  test('it creates the anomalies without filtering anything out since they are all well formed', () => {
    const wrapper = mount(<span>{createInfluencers(anomalies.anomalies[0].influencers)}</span>);
    expect(wrapper.text()).toEqual('host.name: "zeek-iowa"process.name: "du"user.name: "root"');
  });

  test('it returns empty text when passed in empty objects of influencers', () => {
    anomalies.anomalies[0].influencers = [{}, {}, {}];
    const wrapper = mount(<span>{createInfluencers(anomalies.anomalies[0].influencers)}</span>);
    expect(wrapper.text()).toEqual('');
  });

  test('it filters out empty anomalies but keeps the others', () => {
    anomalies.anomalies[0].influencers = [
      { 'influencer-name-one': 'influencer-value-one' },
      {},
      { 'influencer-name-two': 'influencer-value-two' },
    ];
    const wrapper = mount(<span>{createInfluencers(anomalies.anomalies[0].influencers)}</span>);
    expect(wrapper.text()).toEqual(
      'influencer-name-one: "influencer-value-one"influencer-name-two: "influencer-value-two"'
    );
  });
});
