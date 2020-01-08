/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { Direction } from '../../../graphql/types';
import { mockIndexPattern } from '../../../mock';
import { TestProviders } from '../../../mock/test_providers';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../../utils/use_mount_appended';

import { TimelineHeaderComponent } from '.';

jest.mock('../../../lib/kibana');

describe('Header', () => {
  const indexPattern = mockIndexPattern;
  const mount = useMountAppended();

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TimelineHeaderComponent
          browserFields={{}}
          dataProviders={mockDataProviders}
          id="foo"
          indexPattern={indexPattern}
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onDataProviderEdited={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          show={true}
          showCallOutUnauthorizedMsg={false}
          sort={{
            columnId: '@timestamp',
            sortDirection: Direction.desc,
          }}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeaderComponent
            browserFields={{}}
            dataProviders={mockDataProviders}
            id="foo"
            indexPattern={indexPattern}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
            showCallOutUnauthorizedMsg={false}
            sort={{
              columnId: '@timestamp',
              sortDirection: Direction.desc,
            }}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="dataProviders"]').exists()).toEqual(true);
    });

    test('it renders the unauthorized call out providers', () => {
      const wrapper = mount(
        <TestProviders>
          <TimelineHeaderComponent
            browserFields={{}}
            dataProviders={mockDataProviders}
            id="foo"
            indexPattern={indexPattern}
            onChangeDataProviderKqlQuery={jest.fn()}
            onChangeDroppableAndProvider={jest.fn()}
            onDataProviderEdited={jest.fn()}
            onDataProviderRemoved={jest.fn()}
            onToggleDataProviderEnabled={jest.fn()}
            onToggleDataProviderExcluded={jest.fn()}
            show={true}
            showCallOutUnauthorizedMsg={true}
            sort={{
              columnId: '@timestamp',
              sortDirection: Direction.desc,
            }}
          />
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineCallOutUnauthorized"]').exists()).toEqual(true);
    });
  });
});
