/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Query } from '@kbn/es-query';
import { useAdditionalEpisodesDataSource } from '@kbn/alerting-v2-episodes-ui/context/episode_data_source_context';
import { EpisodesKqlInput } from './episodes_kql_input';

const mockQueryStringInput = jest.fn((props: Record<string, unknown>) => (
  <input
    data-test-subj={props.dataTestSubj as string}
    data-invalid={String(props.isInvalid)}
    data-clearable={String(props.isClearable)}
    value={(props.query as Query).query as string}
    onChange={(event) =>
      (props.onChange as (query: Query) => void)({
        query: event.target.value,
        language: 'kuery',
      })
    }
    onKeyDown={(event) => {
      if (event.key === 'Enter') {
        (props.onSubmit as () => void)();
      }
    }}
  />
));

const mockDataView = { id: 'episodes-search-data-view' };
const mockDataViewsCreate = jest.fn().mockResolvedValue(mockDataView);
const mockKqlStart = { QueryStringInput: mockQueryStringInput };
const mockDataViewsStart = { create: mockDataViewsCreate };

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn((token: string) =>
    token === 'PluginStart(kql)' ? mockKqlStart : mockDataViewsStart
  ),
}));

jest.mock('@kbn/core-di', () => ({
  PluginStart: jest.fn((name: string) => `PluginStart(${name})`),
}));

jest.mock('@kbn/alerting-v2-episodes-ui/context/episode_data_source_context', () => ({
  useAdditionalEpisodesDataSource: jest.fn(),
}));

const mockUseAdditionalEpisodesDataSource = jest.mocked(useAdditionalEpisodesDataSource);
const mockHttp = {
  get: jest.fn().mockResolvedValue(['data.host.name']),
};

describe('EpisodesKqlInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHttp.get.mockResolvedValue(['data.host.name']);
    mockUseAdditionalEpisodesDataSource.mockReturnValue(undefined);
  });

  it('reports changes, validates supported KQL, and submits on Enter', async () => {
    const onChange = jest.fn();
    const onSubmit = jest.fn();
    const { rerender } = render(
      <EpisodesKqlInput
        value=""
        onChange={onChange}
        onSubmit={onSubmit}
        http={mockHttp as never}
        data-test-subj="episodesKqlInput"
      />
    );

    fireEvent.change(screen.getByTestId('episodesKqlInput'), {
      target: { value: 'severity: high' },
    });
    fireEvent.change(screen.getByTestId('episodesKqlInput'), {
      target: { value: 'severity:' },
    });

    expect(onChange).toHaveBeenNthCalledWith(1, 'severity: high');
    expect(onChange).toHaveBeenNthCalledWith(2, 'severity:');
    rerender(
      <EpisodesKqlInput
        value="severity:"
        onChange={onChange}
        onSubmit={onSubmit}
        http={mockHttp as never}
        data-test-subj="episodesKqlInput"
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId('episodesKqlInput')).toHaveAttribute('data-invalid', 'true')
    );
    expect(screen.getByTestId('episodesKqlInput')).toHaveAttribute('data-clearable', 'false');

    fireEvent.keyDown(screen.getByTestId('episodesKqlInput'), { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('merges v2, data, and additional source fields into autocomplete', async () => {
    mockUseAdditionalEpisodesDataSource.mockReturnValue({
      fetchSearchFields: jest.fn().mockResolvedValue([
        {
          name: 'kibana.alert.rule.name',
          type: 'string',
          esTypes: ['keyword'],
          searchable: true,
          aggregatable: true,
        },
      ]),
    } as never);

    render(
      <EpisodesKqlInput
        value=""
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        http={mockHttp as never}
      />
    );

    await waitFor(() => {
      const latestProps = mockQueryStringInput.mock.calls.at(-1)?.[0] as {
        indexPatterns: unknown[];
        suggestionsAbstraction: {
          valueSuggestionTypeByField: Record<string, string>;
        };
      };
      expect(latestProps.indexPatterns).toEqual([mockDataView]);
      expect(latestProps.suggestionsAbstraction.valueSuggestionTypeByField).toEqual({
        'kibana.alert.rule.name': 'alerts',
      });
    });

    expect(mockDataViewsCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fields: expect.objectContaining({
          'alert.id': expect.objectContaining({ name: 'alert.id', type: 'string' }),
          'alert.status': expect.objectContaining({ name: 'alert.status', type: 'string' }),
          '@timestamp': expect.objectContaining({ name: '@timestamp', type: 'date' }),
          'data.host.name': expect.objectContaining({ name: 'data.host.name', type: 'string' }),
          'kibana.alert.rule.name': expect.objectContaining({
            name: 'kibana.alert.rule.name',
            type: 'string',
          }),
        }),
      }),
      true
    );
  });

  it('does not surface missing alert permissions as an input error', async () => {
    const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockHttp.get.mockRejectedValue({ response: { status: 403 } });

    render(
      <EpisodesKqlInput
        value=""
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        http={mockHttp as never}
      />
    );

    await waitFor(() => expect(mockHttp.get).toHaveBeenCalled());
    expect(mockConsoleWarn).not.toHaveBeenCalled();
    expect(mockQueryStringInput.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ isInvalid: false })
    );
    mockConsoleWarn.mockRestore();
  });

  it('logs unexpected field loading errors without invalidating the input', async () => {
    const error = new Error('boom');
    const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockHttp.get.mockRejectedValue(error);

    render(
      <EpisodesKqlInput
        value=""
        onChange={jest.fn()}
        onSubmit={jest.fn()}
        http={mockHttp as never}
      />
    );

    await waitFor(() =>
      expect(mockConsoleWarn).toHaveBeenCalledWith('Failed to load alert search fields.', error)
    );
    expect(mockQueryStringInput.mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ isInvalid: false })
    );
    mockConsoleWarn.mockRestore();
  });
});
