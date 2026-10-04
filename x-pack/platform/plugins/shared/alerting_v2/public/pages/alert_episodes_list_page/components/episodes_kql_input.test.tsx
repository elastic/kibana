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
  />
));

jest.mock('@kbn/core-di-browser', () => ({
  useService: jest.fn(() => ({ QueryStringInput: mockQueryStringInput })),
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
    mockUseAdditionalEpisodesDataSource.mockReturnValue(undefined);
  });

  it('reports whether the changed query is valid KQL', async () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <EpisodesKqlInput
        value=""
        onChange={onChange}
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

    expect(onChange).toHaveBeenNthCalledWith(1, 'severity: high', true);
    expect(onChange).toHaveBeenNthCalledWith(2, 'severity:', false);
    rerender(
      <EpisodesKqlInput
        value="severity:"
        onChange={onChange}
        http={mockHttp as never}
        data-test-subj="episodesKqlInput"
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId('episodesKqlInput')).toHaveAttribute('data-invalid', 'true')
    );
    expect(screen.getByTestId('episodesKqlInput')).toHaveAttribute('data-clearable', 'false');
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

    render(<EpisodesKqlInput value="" onChange={jest.fn()} http={mockHttp as never} />);

    await waitFor(() => {
      const latestProps = mockQueryStringInput.mock.calls.at(-1)?.[0] as {
        indexPatterns: Array<{ fields: Array<{ name: string }> }>;
      };
      expect(latestProps.indexPatterns[0].fields.map(({ name }) => name)).toEqual(
        expect.arrayContaining([
          'episode.status',
          'severity',
          'data.host.name',
          'kibana.alert.rule.name',
        ])
      );
    });
  });
});
