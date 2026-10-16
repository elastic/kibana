/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '../../../../../test_utils/render_with_ml_context';
import { useMlApi } from '../../../../../contexts/kibana/use_ml_api_context';
import { EsqlQueryTimeRangeStep } from './esql_query_time_range_step';
import { EsqlWizardProvider, useEsqlWizardContext } from './esql_wizard_context';

jest.mock('../../../../../contexts/kibana/use_ml_api_context', () => ({
  useMlApi: jest.fn(),
}));

jest.mock('../../../../../contexts/kibana', () => ({
  useMlKibana: () => ({ services: { data: { search: { search: jest.fn() } } } }),
}));

jest.mock('./esql_query_output_preview', () => ({
  EsqlQueryOutputPreview: () => <div data-test-subj="mlEsqlQueryOutputPreviewStub" />,
}));

jest.mock('./esql_histogram_chart', () => ({
  EsqlHistogramChart: () => <div data-test-subj="mlEsqlHistogramChartStub" />,
}));

/**
 * Deliberately does NOT mock `EuiSuperDatePicker`: the bug (owner walk-through,
 * g2sz.10) only reproduces with the real picker mounted inside the step's
 * `<form>`, so the mocked picker in `esql_query_time_range_step.test.tsx`
 * could not catch it.
 */
describe('EsqlQueryTimeRangeStep with the real EuiSuperDatePicker', () => {
  let submitEvents: Event[];
  const onSubmit = (event: Event) => {
    submitEvents.push(event);
  };

  beforeEach(() => {
    submitEvents = [];
    jest.mocked(useMlApi).mockReturnValue({
      getEsqlQueryColumns: jest.fn().mockResolvedValue({ columns: [] }),
    } as unknown as ReturnType<typeof useMlApi>);
    document.addEventListener('submit', onSubmit, true);
  });

  afterEach(() => {
    document.removeEventListener('submit', onSubmit, true);
    jest.clearAllMocks();
  });

  it('does not submit (reload) the page when the quick-select calendar dropdown is used', () => {
    let wizardStart = '';
    const Probe = () => {
      wizardStart = useEsqlWizardContext().state.wizardStart;
      return null;
    };
    const { container } = renderWithI18n(
      <EsqlWizardProvider>
        <Probe />
        <EsqlQueryTimeRangeStep />
      </EsqlWizardProvider>
    );

    // Root cause: EuiSuperDatePicker's calendar (quick select) toggle is an
    // `EuiFormPrepend element="button"` without `type="button"`, so inside a
    // <form> it is a submit button and clicking it reloads the page.
    fireEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));
    fireEvent.click(screen.getByTestId('superDatePickerQuickSelectApplyButton'));

    expect(wizardStart).toBe('now-15m');
    expect(submitEvents).toHaveLength(0);
    expect(container.querySelector('form')).toBeNull();
  });
});
