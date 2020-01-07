/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { mockBrowserFields } from '../../../../../containers/source/mock';
import { mockTimelineData } from '../../../../../mock';
import { TestProviders } from '../../../../../mock/test_providers';
import { useMountAppended } from '../../../../../utils/use_mount_appended';
import { SuricataDetails } from './suricata_details';

describe('SuricataDetails', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default SuricataDetails', () => {
      const wrapper = shallow(
        <SuricataDetails
          browserFields={mockBrowserFields}
          data={mockTimelineData[2].ecs}
          timelineId="test"
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it returns text if the data does contain suricata data', () => {
      const wrapper = mount(
        <TestProviders>
          <SuricataDetails
            browserFields={mockBrowserFields}
            data={mockTimelineData[2].ecs}
            timelineId="test"
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual(
        '4ETEXPLOITNETGEARWNR2000v5 hidden_lang_avi Stack Overflow (CVE-2016-10174)Source192.168.0.3:53Destination192.168.0.3:6343'
      );
    });

    test('it returns null for text if the data contains no suricata data', () => {
      const wrapper = shallow(
        <SuricataDetails
          browserFields={mockBrowserFields}
          data={mockTimelineData[0].ecs}
          timelineId="test"
        />
      );
      expect(wrapper.isEmptyRender()).toBeTruthy();
    });
  });
});
