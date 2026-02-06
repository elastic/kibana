/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { useGetRuleTagsQuery } from '@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query';
import { AlertsFiltersFormContextProvider } from '../contexts/alerts_filters_form_context';
import { AlertsFilterByRuleTags, filterMetadata } from './alerts_filter_by_rule_tags';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();
jest.mock('@kbn/response-ops-rules-apis/hooks/use_get_rule_tags_query');
const mockUseGetRuleTagsQuery = jest.mocked(useGetRuleTagsQuery);

const ruleTagsBaseQueryResult = {
  hasNextPage: false,
  fetchNextPage: jest.fn(),
  refetch: jest.fn(),
};

describe('AlertsFilterByRuleTags', () => {
  it('should show all available tags as options', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: ['tag1', 'tag2'],
      isLoading: false,
      isError: false,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider
        value={{ ruleTypeIds: ['.es-query'], services: { http, notifications } }}
      >
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('should show the selected tag in the combobox', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: ['tag1', 'tag2'],
      isLoading: false,
      isError: false,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider
        value={{ ruleTypeIds: ['.es-query'], services: { http, notifications } }}
      >
        <AlertsFilterByRuleTags value={['tag1']} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    const comboboxPills = screen.getAllByTestId('euiComboBoxPill');
    expect(comboboxPills).toHaveLength(1);
    expect(comboboxPills[0]).toHaveTextContent('tag1');
  });

  it('should set the combobox in loading mode while loading the available tags', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: [],
      isLoading: true,
      isError: false,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider
        value={{ ruleTypeIds: ['.es-query'], services: { http, notifications } }}
      >
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should disable the combobox when the tags query fails', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: [],
      isLoading: false,
      isError: true,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider
        value={{ ruleTypeIds: ['.es-query'], services: { http, notifications } }}
      >
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    const comboboxInput = screen.getByTestId('comboBoxSearchInput');
    expect(comboboxInput).toHaveAttribute('aria-invalid', 'true');
    expect(comboboxInput).toBeDisabled();
  });

  it('should disable the combobox when no tags are available', async () => {
    mockUseGetRuleTagsQuery.mockReturnValue({
      tags: [],
      isLoading: false,
      isError: false,
      ...ruleTagsBaseQueryResult,
    });
    render(
      <AlertsFiltersFormContextProvider
        value={{ ruleTypeIds: ['.es-query'], services: { http, notifications } }}
      >
        <AlertsFilterByRuleTags value={[]} onChange={jest.fn()} />
      </AlertsFiltersFormContextProvider>
    );
    const comboboxInput = screen.getByTestId('comboBoxSearchInput');
    expect(comboboxInput).toHaveAttribute('disabled');
    expect(comboboxInput).toHaveAttribute('placeholder', 'No tags available');
  });

  describe('filterMetadata', () => {
    it('should have the correct type id and component', () => {
      expect(filterMetadata.id).toEqual('ruleTags');
      expect(filterMetadata.component).toEqual(AlertsFilterByRuleTags);
    });

    describe('isEmpty', () => {
      it.each([undefined, null, []])('should return false for %s', (value) => {
        expect(
          filterMetadata.isEmpty(value as Parameters<typeof filterMetadata.isEmpty>[0])
        ).toEqual(true);
      });

      it('should return true for non-empty values', () => {
        expect(filterMetadata.isEmpty(['test-tag'])).toEqual(false);
      });
    });
  });
});
