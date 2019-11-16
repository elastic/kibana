/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { mockDetailItemData, mockDetailItemDataId } from '../../mock/mock_detail_item';
import { TestProviders } from '../../mock/test_providers';

import { EventDetails } from './event_details';
import { mockBrowserFields } from '../../containers/source/mock';
import { defaultHeaders } from '../../mock/header';

jest.mock('../../lib/settings/use_kibana_ui_setting');

describe('EventDetails', () => {
  describe('rendering', () => {
    test('should match snapshot', () => {
      const wrapper = shallow(
        <EventDetails
          browserFields={mockBrowserFields}
          columnHeaders={defaultHeaders}
          data={mockDetailItemData}
          id={mockDetailItemDataId}
          view="table-view"
          onUpdateColumns={jest.fn()}
          onViewSelected={jest.fn()}
          timelineId="test"
          toggleColumn={jest.fn()}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('tabs', () => {
    ['Table', 'JSON View'].forEach(tab => {
      test(`it renders the ${tab} tab`, () => {
        const wrapper = mount(
          <TestProviders>
            <EventDetails
              browserFields={mockBrowserFields}
              columnHeaders={defaultHeaders}
              data={mockDetailItemData}
              id={mockDetailItemDataId}
              view="table-view"
              onUpdateColumns={jest.fn()}
              onViewSelected={jest.fn()}
              timelineId="test"
              toggleColumn={jest.fn()}
            />
          </TestProviders>
        );

        expect(
          wrapper
            .find('[data-test-subj="eventDetails"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Table tab is selected by default', () => {
      const wrapper = mount(
        <TestProviders>
          <EventDetails
            browserFields={mockBrowserFields}
            columnHeaders={defaultHeaders}
            data={mockDetailItemData}
            id={mockDetailItemDataId}
            view="table-view"
            onUpdateColumns={jest.fn()}
            onViewSelected={jest.fn()}
            timelineId="test"
            toggleColumn={jest.fn()}
          />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="eventDetails"]')
          .find('.euiTab-isSelected')
          .first()
          .text()
      ).toEqual('Table');
    });
  });
});
