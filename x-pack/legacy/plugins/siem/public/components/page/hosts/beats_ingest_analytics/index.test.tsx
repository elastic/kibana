/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow, ShallowWrapper } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockData } from './mock';
import { BeatsIngestAnalytics } from '.';

describe('beats ingest analytics', () => {
  describe('render', () => {
    test('it should render spinner if it is loading', () => {
      const wrapper: ShallowWrapper = shallow(
        <BeatsIngestAnalytics data={mockData} loading={true} />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it should render BeatsIngestAnalytics', () => {
      const wrapper: ShallowWrapper = shallow(
        <BeatsIngestAnalytics data={mockData} loading={false} />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });
});
