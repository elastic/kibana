/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';
import { MockedProvider } from 'react-apollo/test-utils';

import { timelineQuery } from '../../containers/timeline/index.gql_query';
import { mockBrowserFields } from '../../containers/source/mock';
import { Direction } from '../../graphql/types';
import { defaultHeaders, mockTimelineData, mockIndexPattern } from '../../mock';
import { TestProviders } from '../../mock/test_providers';
import { flyoutHeaderHeight } from '../flyout';

import {
  DELETE_CLASS_NAME,
  ENABLE_CLASS_NAME,
  EXCLUDE_CLASS_NAME,
} from './data_providers/provider_item_actions';
import { TimelineComponent } from './timeline';
import { Sort } from './body/sort';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { useMountAppended } from '../../utils/use_mount_appended';

const testFlyoutHeight = 980;

jest.mock('../../lib/kibana');

describe('Timeline', () => {
  const sort: Sort = {
    columnId: '@timestamp',
    sortDirection: Direction.desc,
  };
  const startDate = new Date('2018-03-23T18:49:23.132Z').valueOf();
  const endDate = new Date('2018-03-24T03:33:52.253Z').valueOf();

  const indexPattern = mockIndexPattern;

  const mocks = [
    { request: { query: timelineQuery }, result: { data: { events: mockTimelineData } } },
  ];

  const mount = useMountAppended();

  describe('rendering', () => {
    test('renders correctly against snapshot', () => {
      const wrapper = shallow(
        <TimelineComponent
          browserFields={mockBrowserFields}
          columns={defaultHeaders}
          id="foo"
          dataProviders={mockDataProviders}
          end={endDate}
          eventType="raw"
          filters={[]}
          flyoutHeight={testFlyoutHeight}
          flyoutHeaderHeight={flyoutHeaderHeight}
          indexPattern={indexPattern}
          indexToAdd={[]}
          isLive={false}
          itemsPerPage={5}
          itemsPerPageOptions={[5, 10, 20]}
          kqlMode="search"
          kqlQueryExpression=""
          loadingIndexName={false}
          onChangeDataProviderKqlQuery={jest.fn()}
          onChangeDroppableAndProvider={jest.fn()}
          onChangeItemsPerPage={jest.fn()}
          onDataProviderEdited={jest.fn()}
          onDataProviderRemoved={jest.fn()}
          onToggleDataProviderEnabled={jest.fn()}
          onToggleDataProviderExcluded={jest.fn()}
          show={true}
          showCallOutUnauthorizedMsg={false}
          start={startDate}
          sort={sort}
          toggleColumn={jest.fn()}
        />
      );
      expect(wrapper).toMatchSnapshot();
    });

    test('it renders the timeline header', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent
              browserFields={mockBrowserFields}
              columns={defaultHeaders}
              id="foo"
              dataProviders={mockDataProviders}
              end={endDate}
              eventType="raw"
              filters={[]}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              indexPattern={indexPattern}
              indexToAdd={[]}
              isLive={false}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQueryExpression=""
              loadingIndexName={false}
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              show={true}
              showCallOutUnauthorizedMsg={false}
              start={startDate}
              sort={sort}
              toggleColumn={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="timelineHeader"]').exists()).toEqual(true);
    });

    test('it renders the timeline table', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent
              browserFields={mockBrowserFields}
              columns={defaultHeaders}
              id="foo"
              dataProviders={mockDataProviders}
              end={endDate}
              eventType="raw"
              filters={[]}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              indexPattern={indexPattern}
              indexToAdd={[]}
              isLive={false}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQueryExpression=""
              loadingIndexName={false}
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              show={true}
              showCallOutUnauthorizedMsg={false}
              start={startDate}
              sort={sort}
              toggleColumn={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="events-table"]').exists()).toEqual(true);
    });

    test('it does NOT render the paging footer when you do NOT have any data providers', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent
              browserFields={mockBrowserFields}
              columns={defaultHeaders}
              id="foo"
              dataProviders={mockDataProviders}
              end={endDate}
              eventType="raw"
              filters={[]}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              indexPattern={indexPattern}
              indexToAdd={[]}
              isLive={false}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQueryExpression=""
              loadingIndexName={false}
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              show={true}
              showCallOutUnauthorizedMsg={false}
              start={startDate}
              sort={sort}
              toggleColumn={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="table-pagination"]').exists()).toEqual(false);
    });

    test('it defaults to showing `All events`', () => {
      const wrapper = mount(
        <TestProviders>
          <MockedProvider mocks={mocks}>
            <TimelineComponent
              browserFields={mockBrowserFields}
              columns={defaultHeaders}
              id="foo"
              dataProviders={mockDataProviders}
              end={endDate}
              eventType="all" // CAUTION: `eventType` is an optional prop in post-`7.6.x` branches. In later branches, `eventType` is omitted from this test, to truly verify the new default from redux. In this branch, we must specify `eventType` to pass the type check, but this is not the true intent of this test.
              filters={[]}
              flyoutHeight={testFlyoutHeight}
              flyoutHeaderHeight={flyoutHeaderHeight}
              indexPattern={indexPattern}
              indexToAdd={[]}
              isLive={false}
              itemsPerPage={5}
              itemsPerPageOptions={[5, 10, 20]}
              kqlMode="search"
              kqlQueryExpression=""
              loadingIndexName={false}
              onChangeDataProviderKqlQuery={jest.fn()}
              onChangeDroppableAndProvider={jest.fn()}
              onChangeItemsPerPage={jest.fn()}
              onDataProviderEdited={jest.fn()}
              onDataProviderRemoved={jest.fn()}
              onToggleDataProviderEnabled={jest.fn()}
              onToggleDataProviderExcluded={jest.fn()}
              show={true}
              showCallOutUnauthorizedMsg={false}
              start={startDate}
              sort={sort}
              toggleColumn={jest.fn()}
            />
          </MockedProvider>
        </TestProviders>
      );

      expect(wrapper.find('[data-test-subj="pick-event-type"] button').text()).toEqual(
        'All events'
      );
    });
  });

  describe('event wire up', () => {
    describe('onDataProviderRemoved', () => {
      test('it invokes the onDataProviderRemoved callback when the delete button on a provider is clicked', () => {
        const mockOnDataProviderRemoved = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={mockDataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"] svg')
          .first()
          .simulate('click');

        expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
      });

      test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the provider menu', () => {
        const mockOnDataProviderRemoved = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={mockDataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );
        wrapper
          .find('button[data-test-subj="providerBadge"]')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect(mockOnDataProviderRemoved.mock.calls[0][0]).toEqual('id-Provider 1');
      });
    });

    describe('onToggleDataProviderEnabled', () => {
      test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the provider menu', () => {
        const mockOnToggleDataProviderEnabled = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={mockDataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('button[data-test-subj="providerBadge"]')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
          providerId: 'id-Provider 1',
          enabled: false,
        });
      });
    });

    describe('onToggleDataProviderExcluded', () => {
      test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the provider menu', () => {
        const mockOnToggleDataProviderExcluded = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={mockDataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .first()
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
          providerId: 'id-Provider 1',
          excluded: true,
        });
      });
    });

    describe('#ProviderWithAndProvider', () => {
      test('Rendering And Provider', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={dataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        const andProviderBadges = wrapper.find(
          '[data-test-subj="providerBadge"] .euiBadge__content span.field-value'
        );

        const andProviderBadgesText = andProviderBadges.map(node => node.text()).join(' ');
        expect(andProviderBadges.length).toEqual(6);
        expect(andProviderBadgesText).toEqual(
          'name:  "Provider 1" name:  "Provider 2" name:  "Provider 3"'
        );
      });

      test('it invokes the onDataProviderRemoved callback when you click on the option "Delete" in the accordion menu', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);
        const mockOnDataProviderRemoved = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={dataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={mockOnDataProviderRemoved}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={jest.fn()}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .at(3)
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${DELETE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect(mockOnDataProviderRemoved.mock.calls[0]).toEqual(['id-Provider 1', 'id-Provider 2']);
      });

      test('it invokes the onToggleDataProviderEnabled callback when you click on the option "Temporary disable" in the accordion menu', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);
        const mockOnToggleDataProviderEnabled = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={dataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={mockOnToggleDataProviderEnabled}
                onToggleDataProviderExcluded={jest.fn()}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .at(3)
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${ENABLE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect(mockOnToggleDataProviderEnabled.mock.calls[0][0]).toEqual({
          andProviderId: 'id-Provider 2',
          enabled: false,
          providerId: 'id-Provider 1',
        });
      });

      test('it invokes the onToggleDataProviderExcluded callback when you click on the option "Exclude results" in the accordion menu', () => {
        const dataProviders = mockDataProviders.slice(0, 1);
        dataProviders[0].and = mockDataProviders.slice(1, 3);
        const mockOnToggleDataProviderExcluded = jest.fn();

        const wrapper = mount(
          <TestProviders>
            <MockedProvider mocks={mocks}>
              <TimelineComponent
                browserFields={mockBrowserFields}
                columns={defaultHeaders}
                id="foo"
                dataProviders={dataProviders}
                end={endDate}
                eventType="raw"
                filters={[]}
                flyoutHeight={testFlyoutHeight}
                flyoutHeaderHeight={flyoutHeaderHeight}
                indexPattern={indexPattern}
                indexToAdd={[]}
                isLive={false}
                itemsPerPage={5}
                itemsPerPageOptions={[5, 10, 20]}
                kqlMode="search"
                kqlQueryExpression=""
                loadingIndexName={false}
                onChangeDataProviderKqlQuery={jest.fn()}
                onChangeDroppableAndProvider={jest.fn()}
                onChangeItemsPerPage={jest.fn()}
                onDataProviderEdited={jest.fn()}
                onDataProviderRemoved={jest.fn()}
                onToggleDataProviderEnabled={jest.fn()}
                onToggleDataProviderExcluded={mockOnToggleDataProviderExcluded}
                show={true}
                showCallOutUnauthorizedMsg={false}
                start={startDate}
                sort={sort}
                toggleColumn={jest.fn()}
              />
            </MockedProvider>
          </TestProviders>
        );

        wrapper
          .find('[data-test-subj="providerBadge"]')
          .at(3)
          .find('button')
          .first()
          .simulate('click');

        wrapper.update();

        wrapper
          .find(`[data-test-subj="providerActions"] .${EXCLUDE_CLASS_NAME}`)
          .first()
          .simulate('click');

        expect(mockOnToggleDataProviderExcluded.mock.calls[0][0]).toEqual({
          andProviderId: 'id-Provider 2',
          excluded: true,
          providerId: 'id-Provider 1',
        });
      });
    });
  });
});
