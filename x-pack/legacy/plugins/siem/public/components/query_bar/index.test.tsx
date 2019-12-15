/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount } from 'enzyme';
import React from 'react';

import { FilterManager, SearchBar } from '../../../../../../../src/plugins/data/public';
import { uiSettingsServiceMock } from '../../../../../../../src/core/public/ui_settings/ui_settings_service.mock';
import { useKibanaCore } from '../../lib/compose/kibana_core';
import { TestProviders, mockIndexPattern } from '../../mock';
import { QueryBar, QueryBarComponentProps } from '.';
import { DEFAULT_FROM, DEFAULT_TO } from '../../../common/constants';
import { mockUiSettings } from '../../mock/ui_settings';

jest.mock('ui/new_platform');

const mockUseKibanaCore = useKibanaCore as jest.Mock;
const mockUiSettingsForFilterManager = uiSettingsServiceMock.createSetupContract();
jest.mock('../../lib/compose/kibana_core');
mockUseKibanaCore.mockImplementation(() => ({
  uiSettings: mockUiSettings,
  savedObjects: {},
}));

describe('QueryBar ', () => {
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

  const mockOnChangeQuery = jest.fn();
  const mockOnSubmitQuery = jest.fn();
  const mockOnSavedQuery = jest.fn();

  beforeEach(() => {
    mockOnChangeQuery.mockClear();
    mockOnSubmitQuery.mockClear();
    mockOnSavedQuery.mockClear();
  });

  test('check if we format the appropriate props to QueryBar', () => {
    const wrapper = mount(
      <TestProviders>
        <QueryBar
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      </TestProviders>
    );
    const {
      customSubmitButton,
      timeHistory,
      onClearSavedQuery,
      onFiltersUpdated,
      onQueryChange,
      onQuerySubmit,
      onSaved,
      onSavedQueryUpdated,
      ...searchBarProps
    } = wrapper.find(SearchBar).props();

    expect(searchBarProps).toEqual({
      dataTestSubj: undefined,
      dateRangeFrom: 'now-24h',
      dateRangeTo: 'now',
      filters: [],
      indexPatterns: [
        {
          fields: [
            {
              aggregatable: true,
              name: '@timestamp',
              searchable: true,
              type: 'date',
            },
            {
              aggregatable: true,
              name: '@version',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.ephemeral_id',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.hostname',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.id',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test1',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test2',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test3',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test4',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test5',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test6',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test7',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'agent.test8',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: true,
              name: 'host.name',
              searchable: true,
              type: 'string',
            },
          ],
          title: 'filebeat-*,auditbeat-*,packetbeat-*',
        },
      ],
      isLoading: false,
      isRefreshPaused: true,
      query: {
        language: 'kuery',
        query: 'here: query',
      },
      refreshInterval: undefined,
      showAutoRefreshOnly: false,
      showDatePicker: false,
      showFilterBar: true,
      showQueryBar: true,
      showQueryInput: true,
      showSaveQuery: true,
    });
  });

  describe('#onQueryChange', () => {
    test(' is the only reference that changed when filterQueryDraft props get updated', () => {
      const Proxy = (props: QueryBarComponentProps) => (
        <TestProviders>
          <QueryBar {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      const queryInput = wrapper.find(QueryBar).find('input[data-test-subj="queryInput"]');
      queryInput.simulate('change', { target: { value: 'hello: world' } });
      wrapper.update();

      expect(onChangedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSubmitQueryRef).toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      expect(onSavedQueryRef).toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
    });
  });

  describe('#onQuerySubmit', () => {
    test(' is the only reference that changed when filterQuery props get updated', () => {
      const Proxy = (props: QueryBarComponentProps) => (
        <TestProviders>
          <QueryBar {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      wrapper.setProps({ filterQuery: { expression: 'new: one', kind: 'kuery' } });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      expect(onChangedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSavedQueryRef).toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
    });

    test(' is only reference that changed when timelineId props get updated', () => {
      const Proxy = (props: QueryBarComponentProps) => (
        <TestProviders>
          <QueryBar {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      wrapper.setProps({ onSubmitQuery: jest.fn() });
      wrapper.update();

      expect(onSubmitQueryRef).not.toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
      expect(onChangedQueryRef).toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSavedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
    });
  });

  describe('#onSavedQueryUpdated', () => {
    test('is only reference that changed when dataProviders props get updated', () => {
      const Proxy = (props: QueryBarComponentProps) => (
        <TestProviders>
          <QueryBar {...props} />
        </TestProviders>
      );

      const wrapper = mount(
        <Proxy
          dateRangeFrom={DEFAULT_FROM}
          dateRangeTo={DEFAULT_TO}
          hideSavedQuery={false}
          indexPattern={mockIndexPattern}
          isRefreshPaused={true}
          filterQuery={{ query: 'here: query', language: 'kuery' }}
          filterManager={new FilterManager(mockUiSettingsForFilterManager)}
          filters={[]}
          onChangedQuery={mockOnChangeQuery}
          onSubmitQuery={mockOnSubmitQuery}
          onSavedQuery={mockOnSavedQuery}
        />
      );
      const searchBarProps = wrapper.find(SearchBar).props();
      const onChangedQueryRef = searchBarProps.onQueryChange;
      const onSubmitQueryRef = searchBarProps.onQuerySubmit;
      const onSavedQueryRef = searchBarProps.onSavedQueryUpdated;

      wrapper.setProps({ onSavedQuery: jest.fn() });
      wrapper.update();

      expect(onSavedQueryRef).not.toEqual(wrapper.find(SearchBar).props().onSavedQueryUpdated);
      expect(onChangedQueryRef).toEqual(wrapper.find(SearchBar).props().onQueryChange);
      expect(onSubmitQueryRef).toEqual(wrapper.find(SearchBar).props().onQuerySubmit);
    });
  });
});
