/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mount, shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import * as React from 'react';

import { Direction } from '../../graphql/types';

import { LoadMoreTable } from './index';
import { getHostsColumns, mockData, rowItems, sortedHosts } from './index.mock';
import euiDarkVars from '@elastic/eui/dist/eui_theme_dark.json';
import { ThemeProvider } from 'styled-components';

describe('Load More Table Component', () => {
  const theme = () => ({ eui: euiDarkVars, darkMode: true });
  const loadMore = jest.fn();
  const updateLimitPagination = jest.fn();
  describe('rendering', () => {
    test('it renders the default load more table', () => {
      const wrapper = shallow(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={mockData.Hosts.pageInfo.hasNextPage!}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(toJson(wrapper)).toMatchSnapshot();
    });

    test('it renders the loading panel at the beginning ', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={mockData.Hosts.pageInfo.hasNextPage!}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={true}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={[]}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="InitialLoadingPanelLoadMoreTable"]').exists()
      ).toBeTruthy();
    });

    test('it renders the over loading panel after data has been in the table ', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={mockData.Hosts.pageInfo.hasNextPage!}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={true}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="LoadingPanelLoadMoreTable"]').exists()).toBeTruthy();
    });

    test('it renders the loadMore button if need to fetch more', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={mockData.Hosts.pageInfo.hasNextPage!}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(
        wrapper
          .find('[data-test-subj="loadingMoreButton"]')
          .first()
          .text()
      ).toContain('Load More');
    });

    test('it renders the Loading... in the more load button when fetching new data', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={mockData.Hosts.pageInfo.hasNextPage!}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={true}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(
        wrapper.find('[data-test-subj="InitialLoadingPanelLoadMoreTable"]').exists()
      ).toBeFalsy();
      expect(
        wrapper
          .find('[data-test-subj="loadingMoreButton"]')
          .first()
          .text()
      ).toContain('Loading…');
    });

    test('it does NOT render the loadMore button because there is nothing else to fetch', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={false}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={2}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="loadingMoreButton"]').exists()).toBeFalsy();
    });

    test('it render popover to select new limit in table', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={true}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={2}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="loadingMoreSizeRowPopover"] button')
        .first()
        .simulate('click');
      expect(wrapper.find('[data-test-subj="loadingMorePickSizeRow"]').exists()).toBeTruthy();
    });

    test('it will NOT render popover to select new limit in table if props itemsPerRow is empty', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={true}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={[]}
            limit={2}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('[data-test-subj="loadingMoreSizeRowPopover"]').exists()).toBeFalsy();
    });

    test('It should render a sort icon if sorting is defined', () => {
      const mockOnChange = jest.fn();
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={sortedHosts}
            hasNextPage={true}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={2}
            loading={false}
            loadingTitle="Hosts"
            loadMore={jest.fn()}
            onChange={mockOnChange}
            pageOfItems={mockData.Hosts.edges}
            sorting={{ direction: Direction.asc, field: 'node.host.name' }}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      expect(wrapper.find('.euiTable thead tr th button svg')).toBeTruthy();
    });
  });

  describe('Events', () => {
    test('should call loadmore when clicking on the button load more', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={mockData.Hosts.pageInfo.hasNextPage!}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={1}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="loadingMoreButton"]')
        .first()
        .simulate('click');

      expect(loadMore).toBeCalled();
    });

    test('Should call updateLimitPagination when you pick a new limit', () => {
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={getHostsColumns()}
            hasNextPage={true}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={2}
            loading={false}
            loadingTitle="Hosts"
            loadMore={() => loadMore(mockData.Hosts.pageInfo.endCursor)}
            pageOfItems={mockData.Hosts.edges}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      wrapper
        .find('[data-test-subj="loadingMoreSizeRowPopover"] button')
        .first()
        .simulate('click');

      wrapper
        .find('[data-test-subj="loadingMorePickSizeRow"] button')
        .first()
        .simulate('click');
      expect(updateLimitPagination).toBeCalled();
    });

    test('Should call onChange when you choose a new sort in the table', () => {
      const mockOnChange = jest.fn();
      const wrapper = mount(
        <ThemeProvider theme={theme}>
          <LoadMoreTable
            columns={sortedHosts}
            hasNextPage={true}
            headerCount={1}
            headerSupplement={<p>{'My test supplement.'}</p>}
            headerTitle="Hosts"
            headerTooltip="My test tooltip"
            headerUnit="Test Unit"
            itemsPerRow={rowItems}
            limit={2}
            loading={false}
            loadingTitle="Hosts"
            loadMore={jest.fn()}
            onChange={mockOnChange}
            pageOfItems={mockData.Hosts.edges}
            sorting={{ direction: Direction.asc, field: 'node.host.name' }}
            updateLimitPagination={newlimit => updateLimitPagination({ limit: newlimit })}
          />
        </ThemeProvider>
      );

      wrapper
        .find('.euiTable thead tr th button')
        .first()
        .simulate('click');

      expect(mockOnChange).toBeCalled();
      expect(mockOnChange.mock.calls[0]).toEqual([
        { page: undefined, sort: { direction: 'desc', field: 'node.host.name' } },
      ]);
    });
  });
});
