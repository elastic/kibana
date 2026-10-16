/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { getESQLResults } from '@kbn/esql-utils';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlKibana } from '../../../../../contexts/kibana';
import { EsqlStartFromBeginningButton } from './esql_start_from_beginning_button';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('@kbn/esql-utils', () => ({
  getESQLResults: jest.fn(),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: jest.fn(),
}));

const mockedGetESQLResults = jest.mocked(getESQLResults);
const search = jest.fn();

const boundsResponse = (values: unknown[][]) =>
  ({
    response: {
      columns: [
        { name: 'esql_source_earliest', type: 'date' },
        { name: 'esql_source_latest', type: 'date' },
      ],
      values,
    },
  } as unknown as Awaited<ReturnType<typeof getESQLResults>>);

const Range = () => {
  const { state } = useEsqlWizardContext();

  return <output data-test-subj="range">{`${state.wizardStart}|${state.wizardEnd}`}</output>;
};

const Seed = ({ query, sourceTimeField }: { query?: string; sourceTimeField?: string }) => {
  const { setQueryState } = useEsqlWizardContext();
  React.useEffect(() => {
    setQueryState({
      ...(query !== undefined ? { query } : {}),
      ...(sourceTimeField !== undefined ? { sourceTimeField } : {}),
    });
  }, [query, setQueryState, sourceTimeField]);

  return null;
};

const renderButton = (seed: { query?: string; sourceTimeField?: string } = {}) =>
  renderWithI18n(
    <EsqlWizardProvider>
      <Seed {...seed} />
      <EsqlStartFromBeginningButton />
      <Range />
    </EsqlWizardProvider>
  );

describe('EsqlStartFromBeginningButton', () => {
  beforeEach(() => {
    jest.mocked(useMlKibana).mockReturnValue({
      services: { data: { search: { search } } },
    } as unknown as ReturnType<typeof useMlKibana>);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets the start to the earliest raw source time and the end to now', async () => {
    mockedGetESQLResults.mockResolvedValue(
      boundsResponse([['2026-01-01T00:00:00.000Z', '2026-02-01T00:00:00.000Z']])
    );
    renderButton({
      query: 'FROM logs-* | STATS c = COUNT(*) BY b = BUCKET(ts, 1h)',
      sourceTimeField: 'ts',
    });

    fireEvent.click(screen.getByTestId('mlEsqlStartFromBeginningButton'));

    await waitFor(() =>
      expect(screen.getByTestId('range')).toHaveTextContent('2026-01-01T00:00:00.000Z|now')
    );
    expect(mockedGetESQLResults).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlQuery:
          'FROM logs-* | STATS esql_source_earliest = MIN(ts), esql_source_latest = MAX(ts)',
        search,
      })
    );
    expect(screen.queryByTestId('mlEsqlStartFromBeginningError')).not.toBeInTheDocument();
  });

  it('shows a message and keeps the range when the source is empty', async () => {
    mockedGetESQLResults.mockResolvedValue(boundsResponse([[null, null]]));
    renderButton();

    fireEvent.click(screen.getByTestId('mlEsqlStartFromBeginningButton'));

    expect(await screen.findByTestId('mlEsqlStartFromBeginningError')).toHaveTextContent(
      'No documents with a value for @timestamp were found in logs-*.'
    );
    expect(screen.getByTestId('range')).toHaveTextContent('now-15m|now');
  });

  it('shows the Elasticsearch error reason when the query fails', async () => {
    mockedGetESQLResults.mockRejectedValue({
      body: { attributes: { body: { error: { reason: 'Unknown column [ts]' } } } },
    });
    renderButton({ sourceTimeField: 'ts' });

    fireEvent.click(screen.getByTestId('mlEsqlStartFromBeginningButton'));

    expect(await screen.findByTestId('mlEsqlStartFromBeginningError')).toHaveTextContent(
      'Unknown column [ts]'
    );
    expect(screen.getByTestId('range')).toHaveTextContent('now-15m|now');
  });

  it('explains when the query has no FROM source or the time field is unset, without querying', async () => {
    renderButton({ query: 'ROW a = 1' });

    fireEvent.click(screen.getByTestId('mlEsqlStartFromBeginningButton'));
    expect(await screen.findByTestId('mlEsqlStartFromBeginningError')).toHaveTextContent(
      'Unable to determine the source from the query'
    );
    expect(mockedGetESQLResults).not.toHaveBeenCalled();
  });

  it('explains when the source time field is empty, without querying', async () => {
    renderButton({ sourceTimeField: '' });

    fireEvent.click(screen.getByTestId('mlEsqlStartFromBeginningButton'));
    expect(await screen.findByTestId('mlEsqlStartFromBeginningError')).toHaveTextContent(
      'Set a source time field'
    );
    expect(mockedGetESQLResults).not.toHaveBeenCalled();
  });

  it('is a non-submitting button', () => {
    renderButton();

    expect(screen.getByTestId('mlEsqlStartFromBeginningButton')).toHaveAttribute('type', 'button');
  });
});
