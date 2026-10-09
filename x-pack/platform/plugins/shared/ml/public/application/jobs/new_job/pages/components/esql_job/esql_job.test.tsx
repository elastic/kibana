/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { Page, EsqlWizard } from './esql_job';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({
    services: {
      application: {
        getUrlForApp: jest.fn(),
        navigateToApp: jest.fn(),
      },
    },
  }),
  useNavigateToPath: () => jest.fn(),
}));

jest.mock('./esql_columns_resolver', () => ({
  useEsqlColumnsResolver: jest.fn(),
}));

jest.mock('./esql_histogram_executor', () => ({
  useEsqlHistogramExecutor: jest.fn(),
}));

jest.mock('./esql_query_time_range_step', () => ({
  EsqlQueryTimeRangeStep: () => <div data-test-subj="mlEsqlQueryTimeRangeStepStub" />,
}));

jest.mock('./esql_pick_fields_step', () => ({
  EsqlPickFieldsStep: () => <div data-test-subj="mlEsqlPickFieldsStepStub" />,
}));

jest.mock('./esql_job_details_step', () => ({
  EsqlJobDetailsStep: () => <div data-test-subj="mlEsqlJobDetailsStepStub" />,
}));

jest.mock('./esql_summary_step', () => ({
  EsqlSummaryStep: () => <div data-test-subj="mlEsqlSummaryStepStub" />,
}));

describe('ES|QL job page', () => {
  it('renders the stepper shell', () => {
    renderWithI18n(<Page />);

    expect(screen.getByTestId('mlPageEsqlJob')).toBeInTheDocument();
    expect(screen.getByTestId('appHeaderTitle')).toHaveTextContent('ES|QL');
    expect(screen.getByTestId('mlEsqlQueryTimeRangeStepStub')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlWizardQueryTimeRangeStep')).toBeInTheDocument();
  });
});

describe('EsqlWizard step navigation', () => {
  const SeedQueryTimeRangeStep = () => {
    const { setQueryState, setQueryProbeState, setHistogramState } = useEsqlWizardContext();

    useEffect(() => {
      setQueryProbeState('success');
      setQueryState({
        columns: [{ name: 'bucket', type: 'date', userDefined: false }],
        emittedTimeField: 'bucket',
      });
      setHistogramState({ histogramStatus: 'success', histogramTotalRows: 5 });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return null;
  };

  const renderWizard = () =>
    renderWithI18n(
      <EsqlWizardProvider>
        <SeedQueryTimeRangeStep />
        <EsqlWizard />
      </EsqlWizardProvider>
    );

  it('blocks Next on step 1 until columns, time range, and histogram all resolve', () => {
    renderWithI18n(
      <EsqlWizardProvider>
        <EsqlWizard />
      </EsqlWizardProvider>
    );

    expect(screen.getByTestId('mlJobWizardNavButtonNext')).toBeDisabled();
  });

  it('enables Next once step 1 conditions are satisfied and advances to step 2', () => {
    renderWizard();

    expect(screen.getByTestId('mlJobWizardNavButtonNext')).toBeEnabled();
    fireEvent.click(screen.getByTestId('mlJobWizardNavButtonNext'));

    expect(screen.getByTestId('mlEsqlPickFieldsStepStub')).toBeInTheDocument();
  });

  it('blocks jumping ahead via the horizontal steps past highestStep', () => {
    renderWizard();

    fireEvent.click(screen.getByTestId('mlEsqlWizardJobDetailsStep'));

    // Still on step 1 — Job details (step 3) is beyond highestStep.
    expect(screen.getByTestId('mlEsqlQueryTimeRangeStepStub')).toBeInTheDocument();
  });

  it('allows jumping back to a previously visited step via the horizontal steps', () => {
    renderWizard();

    fireEvent.click(screen.getByTestId('mlJobWizardNavButtonNext'));
    expect(screen.getByTestId('mlEsqlPickFieldsStepStub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mlEsqlWizardQueryTimeRangeStep'));
    expect(screen.getByTestId('mlEsqlQueryTimeRangeStepStub')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('mlEsqlWizardPickFieldsStep'));
    expect(screen.getByTestId('mlEsqlPickFieldsStepStub')).toBeInTheDocument();
  });

  it('re-resolves relative times when returning to step 1 (g2sz.28)', () => {
    const RefreshToken = () => {
      const { state } = useEsqlWizardContext();

      return <output data-test-subj="mlEsqlRefreshToken">{state.rangeRefreshToken}</output>;
    };

    renderWithI18n(
      <EsqlWizardProvider>
        <SeedQueryTimeRangeStep />
        <RefreshToken />
        <EsqlWizard />
      </EsqlWizardProvider>
    );

    expect(screen.getByTestId('mlEsqlRefreshToken')).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId('mlJobWizardNavButtonNext'));
    expect(screen.getByTestId('mlEsqlRefreshToken')).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId('mlJobWizardNavButtonPrevious'));
    expect(screen.getByTestId('mlEsqlQueryTimeRangeStepStub')).toBeInTheDocument();
    expect(screen.getByTestId('mlEsqlRefreshToken')).toHaveTextContent('1');

    fireEvent.click(screen.getByTestId('mlJobWizardNavButtonNext'));
    fireEvent.click(screen.getByTestId('mlEsqlWizardQueryTimeRangeStep'));
    expect(screen.getByTestId('mlEsqlRefreshToken')).toHaveTextContent('2');
  });

  it('hides the Previous button on step 1 and the Next button on the summary step', () => {
    renderWizard();

    expect(screen.queryByTestId('mlJobWizardNavButtonPrevious')).not.toBeInTheDocument();
  });
});
