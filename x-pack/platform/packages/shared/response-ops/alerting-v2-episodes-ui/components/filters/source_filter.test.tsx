/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import {
  EPISODE_SOURCE_FILTER_CLASSIC,
  EPISODE_SOURCE_FILTER_UNIVERSAL,
} from '@kbn/alerting-v2-common-queries';
import { CLASSIC_EPISODE_SOURCE_ID } from '../../classic_alerts/constants';
import { EpisodeDataSourceProvider } from '../../context/episode_data_source_context';
import { createMockSpaces } from '../../hooks/test_utils';
import { createTestEpisodeSource } from '../../types/episode_data_source.mock';
import * as useFetchEpisodeConnectorSourcesModule from '../../hooks/use_fetch_episode_connector_sources';
import { AlertEpisodesSourceFilter } from './source_filter';
import * as inlineFilterPopoverModule from './inline_filter_popover';

const InlineFilterPopoverSpy = jest.spyOn(inlineFilterPopoverModule, 'InlineFilterPopover');

jest.mock('../../hooks/use_fetch_episode_connector_sources', () => ({
  useFetchEpisodeConnectorSources: jest.fn(),
}));

const mockUseFetchEpisodeConnectorSources = jest.mocked(
  useFetchEpisodeConnectorSourcesModule.useFetchEpisodeConnectorSources
);

const optionIdentity = (options: Array<{ label: string; value: string }>) =>
  options.map(({ label, value }) => ({ label, value }));

describe('SourceFilter', () => {
  const defaultProps = {
    selectedSources: null as string[] | null,
    onSourcesChange: jest.fn(),
    services: {
      expressions: {} as ExpressionsStart,
      spaces: createMockSpaces(),
    },
    timeRange: { from: 'now-24h', to: 'now' },
    'data-test-subj': 'test-source-filter',
  };

  const user = userEvent.setup({ delay: null });
  const classicSource = createTestEpisodeSource({ id: CLASSIC_EPISODE_SOURCE_ID });

  const renderFilter = ({
    queryV2Source = true,
    withClassic = true,
    ...props
  }: Partial<typeof defaultProps> & { queryV2Source?: boolean; withClassic?: boolean } = {}) =>
    render(
      <EpisodeDataSourceProvider
        dataSource={withClassic ? classicSource : undefined}
        queryV2Source={queryV2Source}
      >
        <AlertEpisodesSourceFilter {...defaultProps} {...props} />
      </EpisodeDataSourceProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchEpisodeConnectorSources.mockReturnValue({
      data: { sources: ['zabbix'], truncated: false },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useFetchEpisodeConnectorSourcesModule.useFetchEpisodeConnectorSources>);
  });

  const openPopover = () => user.click(screen.getByTestId('test-source-filter-button'));

  it('renders the filter button', () => {
    renderFilter();
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByTestId('test-source-filter-button')).toBeInTheDocument();
  });

  it('shows Universal, Classic, then connector sources', async () => {
    renderFilter();
    await openPopover();

    const { options } = InlineFilterPopoverSpy.mock.calls[0][0];
    expect(optionIdentity(options)).toEqual([
      { label: 'Universal', value: EPISODE_SOURCE_FILTER_UNIVERSAL },
      { label: 'Classic', value: EPISODE_SOURCE_FILTER_CLASSIC },
      { label: 'zabbix', value: 'zabbix' },
    ]);
    expect(InlineFilterPopoverSpy).toHaveBeenCalledWith(
      expect.objectContaining({ singleSelect: false, searchable: true }),
      {}
    );
  });

  it('hides Classic when no classic source is registered', async () => {
    renderFilter({ withClassic: false });
    await openPopover();

    const { options } = InlineFilterPopoverSpy.mock.calls[0][0];
    expect(optionIdentity(options)).toEqual([
      { label: 'Universal', value: EPISODE_SOURCE_FILTER_UNIVERSAL },
      { label: 'zabbix', value: 'zabbix' },
    ]);
  });

  it('hides Universal when the v2 source is not queried', async () => {
    renderFilter({ queryV2Source: false });
    await openPopover();

    const { options } = InlineFilterPopoverSpy.mock.calls[0][0];
    expect(optionIdentity(options)).toEqual([
      { label: 'Classic', value: EPISODE_SOURCE_FILTER_CLASSIC },
      { label: 'zabbix', value: 'zabbix' },
    ]);
  });

  it('keeps a selected system source visible when that source is not offered', async () => {
    renderFilter({ withClassic: false, selectedSources: [EPISODE_SOURCE_FILTER_CLASSIC] });
    await openPopover();

    const { options } = InlineFilterPopoverSpy.mock.calls[0][0];
    expect(optionIdentity(options)).toEqual([
      { label: 'Universal', value: EPISODE_SOURCE_FILTER_UNIVERSAL },
      { label: 'Classic', value: EPISODE_SOURCE_FILTER_CLASSIC },
      { label: 'zabbix', value: 'zabbix' },
    ]);
  });

  it('keeps sources hidden by the search when another source is ticked', async () => {
    const onSourcesChange = jest.fn();
    renderFilter({
      onSourcesChange,
      selectedSources: [EPISODE_SOURCE_FILTER_UNIVERSAL],
    });
    await openPopover();

    act(() => {
      InlineFilterPopoverSpy.mock.calls[0][0].onSearchChange?.('zab');
    });
    act(() => {
      InlineFilterPopoverSpy.mock.calls.at(-1)![0].onSelectionChange(['zabbix']);
    });

    expect(onSourcesChange).toHaveBeenCalledWith([EPISODE_SOURCE_FILTER_UNIVERSAL, 'zabbix']);
  });

  it('keeps a selected connector that is outside the current time range', async () => {
    renderFilter({ selectedSources: ['datadog'] });
    await openPopover();

    const { options } = InlineFilterPopoverSpy.mock.calls[0][0];
    expect(optionIdentity(options)).toEqual([
      { label: 'Universal', value: EPISODE_SOURCE_FILTER_UNIVERSAL },
      { label: 'Classic', value: EPISODE_SOURCE_FILTER_CLASSIC },
      { label: 'datadog', value: 'datadog' },
      { label: 'zabbix', value: 'zabbix' },
    ]);
  });

  it('filters options by the search text', async () => {
    renderFilter();
    await openPopover();

    act(() => {
      InlineFilterPopoverSpy.mock.calls[0][0].onSearchChange?.('zab');
    });

    const { options } = InlineFilterPopoverSpy.mock.calls.at(-1)![0];
    expect(optionIdentity(options)).toEqual([{ label: 'zabbix', value: 'zabbix' }]);
  });

  it('resets the search when the popover closes', async () => {
    renderFilter();
    await openPopover();

    act(() => {
      InlineFilterPopoverSpy.mock.calls[0][0].onSearchChange?.('zab');
    });

    await openPopover();
    await openPopover();

    const { options, searchValue } = InlineFilterPopoverSpy.mock.calls.at(-1)![0];
    expect(searchValue).toBe('');
    expect(optionIdentity(options)).toEqual([
      { label: 'Universal', value: EPISODE_SOURCE_FILTER_UNIVERSAL },
      { label: 'Classic', value: EPISODE_SOURCE_FILTER_CLASSIC },
      { label: 'zabbix', value: 'zabbix' },
    ]);
  });

  it('shows an error when connector sources fail to load', async () => {
    mockUseFetchEpisodeConnectorSources.mockReturnValue({
      data: { sources: [], truncated: false },
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useFetchEpisodeConnectorSourcesModule.useFetchEpisodeConnectorSources>);

    renderFilter();
    await openPopover();

    expect(screen.getByText("Couldn't load connector sources")).toBeInTheDocument();
  });

  it('calls onSourcesChange with the selection and clears it when empty', async () => {
    const onSourcesChange = jest.fn();
    renderFilter({ onSourcesChange });
    await openPopover();

    act(() => {
      InlineFilterPopoverSpy.mock.calls[0][0].onSelectionChange([
        EPISODE_SOURCE_FILTER_UNIVERSAL,
        'zabbix',
      ]);
    });
    expect(onSourcesChange).toHaveBeenCalledWith([EPISODE_SOURCE_FILTER_UNIVERSAL, 'zabbix']);

    act(() => {
      InlineFilterPopoverSpy.mock.calls[0][0].onSelectionChange([]);
    });
    expect(onSourcesChange).toHaveBeenCalledWith(undefined);
  });
});
