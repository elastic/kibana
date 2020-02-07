/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { DEFAULT_FROM, DEFAULT_TO } from '../../../../common/constants';
import { mockBrowserFields } from '../../../containers/source/mock';
import { convertKueryToElasticSearchQuery } from '../../../lib/keury';
import { mockIndexPattern, TestProviders } from '../../../mock';
import { QueryBar } from '../../query_bar';
import { mockDataProviders } from '../data_providers/mock/mock_data_providers';
import { buildGlobalQuery } from '../helpers';

import { QueryBarTimeline, QueryBarTimelineComponentProps, getDataProviderFilter } from './index';

jest.mock('../../../lib/kibana');

describe('Timeline QueryBar ', () => {
  // We are doing that because we need to wrapped this component with redux
  // and redux does not like to be updated and since we need to update our
  // child component (BODY) and we do not want to scare anyone with this error
  // we are hiding it!!!
  // eslint-disable-next-line no-console
  const originalError = console.error;
  beforeAll(() => {
    // eslint-disable-next-line no-console
    console.error = (...args: string[]) => {
      if (/<Provider> does not support changing `store` on the fly/.test(args[0])) {
        return;
      }
      originalError.call(console, ...args);
    };
  });

  const mockApplyKqlFilterQuery = jest.fn();
  const mockSetFilters = jest.fn();
  const mockSetKqlFilterQueryDraft = jest.fn();
  const mockSetSavedQueryId = jest.fn();
  const mockUpdateReduxTime = jest.fn();

  beforeEach(() => {
    mockApplyKqlFilterQuery.mockClear();
    mockSetFilters.mockClear();
    mockSetKqlFilterQueryDraft.mockClear();
    mockSetSavedQueryId.mockClear();
    mockUpdateReduxTime.mockClear();
  });

  test('check if we format the appropriate props to QueryBar', () => {
    const wrapper = mount(
      <TestProviders>
        <QueryBarTimeline
          applyKqlFilterQuery={mockApplyKqlFilterQuery}
          browserFields={mockBrowserFields}
          dataProviders={mockDataProviders}
          filters={[]}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          filterQueryDraft={{ expression: 'here: query', kind: 'kuery' }}
          from={0}
          fromStr={DEFAULT_FROM}
          to={1}
          toStr={DEFAULT_TO}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setKqlFilterQueryDraft={mockSetKqlFilterQueryDraft}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      </TestProviders>
    );
    const queryBarProps = wrapper.find(QueryBar).props();

    expect(queryBarProps.dateRangeFrom).toEqual('now-24h');
    expect(queryBarProps.dateRangeTo).toEqual('now');
    expect(queryBarProps.filterQuery).toEqual({ query: 'here: query', language: 'kuery' });
    expect(queryBarProps.savedQuery).toEqual(null);
  });

  describe('#onChangeQuery', () => {
    test(' is the only reference that changed when filterQueryDraft props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          applyKqlFilterQuery={mockApplyKqlFilterQuery}
          browserFields={mockBrowserFields}
          dataProviders={mockDataProviders}
          filters={[]}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          filterQueryDraft={{ expression: 'here: query', kind: 'kuery' }}
          from={0}
          fromStr={DEFAULT_FROM}
          to={1}
          toStr={DEFAULT_TO}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setKqlFilterQueryDraft={mockSetKqlFilterQueryDraft}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onChangedQueryRef = queryBarProps.onChangedQuery;
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ filterQueryDraft: { expression: 'new: one', kind: 'kuery' } });
      wrapper.update();

      expect(onChangedQueryRef).not.toEqual(wrapper.find(QueryBar).props().onChangedQuery);
      expect(onSubmitQueryRef).toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
      expect(onSavedQueryRef).toEqual(wrapper.find(QueryBar).props().onSavedQuery);
    });
  });

  describe('#onSubmitQuery', () => {
    test(' is the only reference that changed when filterQuery props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          applyKqlFilterQuery={mockApplyKqlFilterQuery}
          browserFields={mockBrowserFields}
          dataProviders={mockDataProviders}
          filters={[]}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          filterQueryDraft={{ expression: 'here: query', kind: 'kuery' }}
          from={0}
          fromStr={DEFAULT_FROM}
          to={1}
          toStr={DEFAULT_TO}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setKqlFilterQueryDraft={mockSetKqlFilterQueryDraft}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onChangedQueryRef = queryBarProps.onChangedQuery;
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ filterQuery: { expression: 'new: one', kind: 'kuery' } });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
      expect(onChangedQueryRef).toEqual(wrapper.find(QueryBar).props().onChangedQuery);
      expect(onSavedQueryRef).toEqual(wrapper.find(QueryBar).props().onSavedQuery);
    });

    test(' is only reference that changed when timelineId props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          applyKqlFilterQuery={mockApplyKqlFilterQuery}
          browserFields={mockBrowserFields}
          dataProviders={mockDataProviders}
          filters={[]}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          filterQueryDraft={{ expression: 'here: query', kind: 'kuery' }}
          from={0}
          fromStr={DEFAULT_FROM}
          to={1}
          toStr={DEFAULT_TO}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setKqlFilterQueryDraft={mockSetKqlFilterQueryDraft}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onChangedQueryRef = queryBarProps.onChangedQuery;
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ timelineId: 'new-timeline' });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
      expect(onChangedQueryRef).toEqual(wrapper.find(QueryBar).props().onChangedQuery);
      expect(onSavedQueryRef).toEqual(wrapper.find(QueryBar).props().onSavedQuery);
    });
  });

  describe('#onSavedQuery', () => {
    test('is only reference that changed when dataProviders props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          applyKqlFilterQuery={mockApplyKqlFilterQuery}
          browserFields={mockBrowserFields}
          dataProviders={mockDataProviders}
          filters={[]}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          filterQueryDraft={{ expression: 'here: query', kind: 'kuery' }}
          from={0}
          fromStr={DEFAULT_FROM}
          to={1}
          toStr={DEFAULT_TO}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setKqlFilterQueryDraft={mockSetKqlFilterQueryDraft}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onChangedQueryRef = queryBarProps.onChangedQuery;
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({ dataProviders: mockDataProviders.slice(1, 0) });
      wrapper.update();

      expect(onSavedQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSavedQuery);
      expect(onChangedQueryRef).toEqual(wrapper.find(QueryBar).props().onChangedQuery);
      expect(onSubmitQueryRef).toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
    });

    test('is only reference that changed when savedQueryId props get updated', () => {
      const Proxy = (props: QueryBarTimelineComponentProps) => (
        <TestProviders>
          <QueryBarTimeline {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          applyKqlFilterQuery={mockApplyKqlFilterQuery}
          browserFields={mockBrowserFields}
          dataProviders={mockDataProviders}
          filters={[]}
          filterQuery={{ expression: 'here: query', kind: 'kuery' }}
          filterQueryDraft={{ expression: 'here: query', kind: 'kuery' }}
          from={0}
          fromStr={DEFAULT_FROM}
          to={1}
          toStr={DEFAULT_TO}
          kqlMode="search"
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          refreshInterval={3000}
          savedQueryId={null}
          setFilters={mockSetFilters}
          setKqlFilterQueryDraft={mockSetKqlFilterQueryDraft}
          setSavedQueryId={mockSetSavedQueryId}
          timelineId="timeline-real-id"
          updateReduxTime={mockUpdateReduxTime}
        />
      );
      const queryBarProps = wrapper.find(QueryBar).props();
      const onChangedQueryRef = queryBarProps.onChangedQuery;
      const onSubmitQueryRef = queryBarProps.onSubmitQuery;
      const onSavedQueryRef = queryBarProps.onSavedQuery;

      wrapper.setProps({
        savedQueryId: 'new',
      });
      wrapper.update();

      expect(onSavedQueryRef).not.toEqual(wrapper.find(QueryBar).props().onSavedQuery);
      expect(onChangedQueryRef).toEqual(wrapper.find(QueryBar).props().onChangedQuery);
      expect(onSubmitQueryRef).toEqual(wrapper.find(QueryBar).props().onSubmitQuery);
    });
  });

  describe('#getDataProviderFilter', () => {
    test('returns valid data provider filter with a simple bool data provider', () => {
      const dataProvidersDsl = convertKueryToElasticSearchQuery(
        buildGlobalQuery(mockDataProviders.slice(0, 1), mockBrowserFields),
        mockIndexPattern
      );
      const filter = getDataProviderFilter(dataProvidersDsl);
      expect(filter).toEqual({
        $state: {
          store: 'appState',
        },
        bool: {
          minimum_should_match: 1,
          should: [
            {
              match_phrase: {
                name: 'Provider 1',
              },
            },
          ],
        },
        meta: {
          alias: 'timeline-filter-drop-area',
          controlledBy: 'timeline-filter-drop-area',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value:
            '{"bool":{"should":[{"match_phrase":{"name":"Provider 1"}}],"minimum_should_match":1}}',
        },
      });
    });

    test('returns valid data provider filter with an exists operator', () => {
      const dataProvidersDsl = convertKueryToElasticSearchQuery(
        buildGlobalQuery(
          [
            {
              id: `id-exists`,
              name,
              enabled: true,
              excluded: false,
              kqlQuery: '',
              queryMatch: {
                field: 'host.name',
                value: '',
                operator: ':*',
              },
              and: [],
            },
          ],
          mockBrowserFields
        ),
        mockIndexPattern
      );
      const filter = getDataProviderFilter(dataProvidersDsl);
      expect(filter).toEqual({
        $state: {
          store: 'appState',
        },
        bool: {
          minimum_should_match: 1,
          should: [
            {
              exists: {
                field: 'host.name',
              },
            },
          ],
        },
        meta: {
          alias: 'timeline-filter-drop-area',
          controlledBy: 'timeline-filter-drop-area',
          disabled: false,
          key: 'bool',
          negate: false,
          type: 'custom',
          value: '{"bool":{"should":[{"exists":{"field":"host.name"}}],"minimum_should_match":1}}',
        },
      });
    });
  });
});
