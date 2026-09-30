/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { EsqlPickFieldsStep } from './esql_pick_fields_step';
import { useEsqlColumnsResolver } from './esql_columns_resolver';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: jest.fn(),
}));

const getEsqlQueryColumns = jest.fn();
const mockedUseMlApi = jest.mocked(useMlApi);

const columns = [
  { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
  { name: 'host', type: 'keyword', hasConflict: false, userDefined: false },
  { name: 'doc_count', type: 'long', hasConflict: false, userDefined: false },
  { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
];

const Harness = () => {
  useEsqlColumnsResolver();

  return <EsqlPickFieldsStep />;
};

const renderStep = () =>
  renderWithI18n(
    <EsqlWizardProvider>
      <Harness />
    </EsqlWizardProvider>
  );

describe('EsqlPickFieldsStep', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    getEsqlQueryColumns.mockResolvedValue({ columns });
    mockedUseMlApi.mockReturnValue({ getEsqlQueryColumns } as unknown as ReturnType<
      typeof useMlApi
    >);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('keeps source time field and bucket span explicit', async () => {
    renderStep();
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('@timestamp');
    expect(screen.getByTestId('mlEsqlBucketSpan')).toHaveValue('1h');
    fireEvent.change(screen.getByTestId('mlEsqlSourceTimeField'), {
      target: { value: 'event.ingested' },
    });
    fireEvent.change(screen.getByTestId('mlEsqlBucketSpan'), { target: { value: '15m' } });
    expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('event.ingested');
    expect(screen.getByTestId('mlEsqlBucketSpan')).toHaveValue('15m');
  });

  it('scopes detector field options to numeric non-time columns', async () => {
    renderStep();
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    await act(async () => {
      fireEvent.focus(within(screen.getByTestId('mlEsqlDetectorField-0')).getByRole('combobox'));
    });
    const detectorFieldListbox = screen.getByRole('listbox');
    expect(within(detectorFieldListbox).getByText('doc_count')).toBeInTheDocument();
    expect(within(detectorFieldListbox).getByText('avg_bytes')).toBeInTheDocument();
    expect(within(detectorFieldListbox).queryByText('host')).not.toBeInTheDocument();
  });

  it('defaults the summary count field to a COUNT(*)-shaped column and turns on delayed-data checking', async () => {
    renderStep();
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlSummaryCountField')).toHaveTextContent('doc_count')
    );
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeChecked();
    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeEnabled();
  });

  it('lets the user manually turn delayed-data checking off while a summary count field is selected', async () => {
    renderStep();
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).toBeChecked());

    fireEvent.click(screen.getByTestId('mlEsqlDelayedDataCheckToggle'));

    expect(screen.getByTestId('mlEsqlDelayedDataCheckToggle')).not.toBeChecked();
  });

  it('seeds a default mean detector on the first numeric non-count column', async () => {
    renderStep();
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );
    expect(screen.queryByTestId('mlEsqlDetectorSummary-1')).not.toBeInTheDocument();
  });

  it('adds and removes detector rows', async () => {
    renderStep();
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    fireEvent.click(screen.getByTestId('mlEsqlAddDetectorButton'));
    expect(screen.getByTestId('mlEsqlDetectorSummary-1')).toHaveTextContent('mean()');

    fireEvent.click(screen.getByTestId('mlEsqlRemoveDetectorButton-1'));
    expect(screen.queryByTestId('mlEsqlDetectorSummary-1')).not.toBeInTheDocument();
  });

  it('prunes a by_field and an influencer that disappear on a query edit, keeping the surviving detector field', async () => {
    const SetQuery = () => {
      const { setQueryState } = useEsqlWizardContext();

      useEffect(() => {
        (window as unknown as { __setQuery: (q: string) => void }).__setQuery = (q: string) =>
          setQueryState({ query: q });
      }, [setQueryState]);

      return null;
    };

    renderWithI18n(
      <EsqlWizardProvider>
        <Harness />
        <SetQuery />
      </EsqlWizardProvider>
    );

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );

    const byFieldInput = screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')!;
    fireEvent.change(byFieldInput, { target: { value: 'host' } });
    fireEvent.keyDown(byFieldInput, { key: 'Enter', code: 'Enter' });

    const influencersInput = screen.getByTestId('mlEsqlInfluencers').querySelector('input')!;
    fireEvent.change(influencersInput, { target: { value: 'host' } });
    fireEvent.keyDown(influencersInput, { key: 'Enter', code: 'Enter' });

    getEsqlQueryColumns.mockResolvedValue({
      columns: [
        { name: 'bucket', type: 'date', hasConflict: false, userDefined: false },
        { name: 'doc_count', type: 'long', hasConflict: false, userDefined: false },
        { name: 'avg_bytes', type: 'double', hasConflict: false, userDefined: false },
      ],
    });

    await act(async () => {
      (window as unknown as { __setQuery: (q: string) => void }).__setQuery(
        'FROM logs-* | STATS avg_bytes = AVG(bytes) BY bucket'
      );
    });

    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(screen.getByTestId('mlEsqlDetectorSummary-0')).toHaveTextContent('mean(avg_bytes)')
    );
    expect(screen.getByTestId('mlEsqlDetectorByField-0').querySelector('input')).toHaveValue('');
    expect(
      within(screen.getByTestId('mlEsqlInfluencers')).queryByText('host')
    ).not.toBeInTheDocument();
  });

  describe('source time field inference (g2sz.18)', () => {
    const renderWithQuerySetter = () => {
      const SetQuery = () => {
        const { setQueryState } = useEsqlWizardContext();

        useEffect(() => {
          (window as unknown as { __setQuery: (q: string) => void }).__setQuery = (q: string) =>
            setQueryState({ query: q });
        }, [setQueryState]);

        return null;
      };

      renderWithI18n(
        <EsqlWizardProvider>
          <Harness />
          <SetQuery />
        </EsqlWizardProvider>
      );
    };

    const setQueryAndResolve = async (query: string) => {
      await act(async () => {
        (window as unknown as { __setQuery: (q: string) => void }).__setQuery(query);
      });
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
    };

    it('pre-fills the source time field from the query while it has not been edited', async () => {
      renderWithQuerySetter();
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });
      expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('@timestamp');

      await setQueryAndResolve(
        'FROM logs-* | STATS doc_count = COUNT(*) BY bucket = BUCKET(event.ingested, 1 hour)'
      );
      expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('event.ingested');

      await setQueryAndResolve(
        'FROM logs-* | STATS doc_count = COUNT(*) BY bucket = BUCKET(event.created, 1 hour)'
      );
      expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('event.created');
    });

    it('keeps the current value when the query is not inferable', async () => {
      renderWithQuerySetter();
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      await setQueryAndResolve('FROM logs-* | STATS doc_count = COUNT(*) BY host');
      expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('@timestamp');
    });

    it('stops re-inferring once the user edits the source time field', async () => {
      renderWithQuerySetter();
      await act(async () => {
        jest.advanceTimersByTime(300);
        await Promise.resolve();
      });

      fireEvent.change(screen.getByTestId('mlEsqlSourceTimeField'), {
        target: { value: 'my_custom_time' },
      });
      await setQueryAndResolve(
        'FROM logs-* | STATS doc_count = COUNT(*) BY bucket = BUCKET(event.ingested, 1 hour)'
      );

      expect(screen.getByTestId('mlEsqlSourceTimeField')).toHaveValue('my_custom_time');
    });
  });

  // A native <form> turns any submit-typed button rendered by EUI (e.g. the
  // date picker's calendar toggle) into a full-page reload.
  it('does not render a native <form> element', () => {
    const { container } = renderStep();

    expect(container.querySelector('form')).toBeNull();
  });
});
