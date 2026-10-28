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
import { createMockSpaces } from '../../hooks/test_utils';
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFetchEpisodeConnectorSources.mockReturnValue({
      data: ['zabbix'],
      isLoading: false,
    } as unknown as ReturnType<typeof useFetchEpisodeConnectorSourcesModule.useFetchEpisodeConnectorSources>);
  });

  const openPopover = () => user.click(screen.getByTestId('test-source-filter-button'));

  it('renders the filter button', () => {
    render(<AlertEpisodesSourceFilter {...defaultProps} />);
    expect(screen.getByText('Source')).toBeInTheDocument();
    expect(screen.getByTestId('test-source-filter-button')).toBeInTheDocument();
  });

  it('shows Universal, Classic, then connector sources', async () => {
    render(<AlertEpisodesSourceFilter {...defaultProps} />);
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

  it('keeps a selected connector that is outside the current time range', async () => {
    render(<AlertEpisodesSourceFilter {...defaultProps} selectedSources={['datadog']} />);
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
    render(<AlertEpisodesSourceFilter {...defaultProps} />);
    await openPopover();

    act(() => {
      InlineFilterPopoverSpy.mock.calls[0][0].onSearchChange?.('zab');
    });

    const { options } = InlineFilterPopoverSpy.mock.calls.at(-1)![0];
    expect(optionIdentity(options)).toEqual([{ label: 'zabbix', value: 'zabbix' }]);
  });

  it('calls onSourcesChange with the selection and clears it when empty', async () => {
    const onSourcesChange = jest.fn();
    render(<AlertEpisodesSourceFilter {...defaultProps} onSourcesChange={onSourcesChange} />);
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
