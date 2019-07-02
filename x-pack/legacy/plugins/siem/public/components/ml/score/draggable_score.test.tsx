/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import toJson from 'enzyme-to-json';
import { mockAnomalies } from '../mock';
import { cloneDeep } from 'lodash/fp';
import { shallow } from 'enzyme';
import { DraggableScore } from './draggable_score';

describe('draggable_score', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <DraggableScore id="some-id" index={0} score={anomalies.anomalies[0]} />
    );
    expect(toJson(wrapper)).toMatchSnapshot();
  });
});
