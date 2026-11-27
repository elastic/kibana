/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { StepDataValueCell, VALUE_TOOLTIP_MAX_CHARS } from './step_data_value_cell';

const renderCell = (value: string) =>
  render(
    <EuiProvider>
      <I18nProvider>
        <StepDataValueCell value={value} />
      </I18nProvider>
    </EuiProvider>
  );

describe('StepDataValueCell', () => {
  it('does not render an expand control for short values', () => {
    renderCell('short value');
    expect(screen.queryByTestId('workflowExecutionStepDataValueExpand')).not.toBeInTheDocument();
    expect(screen.getByText('short value')).toBeInTheDocument();
  });

  it('never uses a tooltip for long values and expands inline on click', () => {
    const longValue = 'x'.repeat(500);
    expect(longValue.length).toBeGreaterThan(VALUE_TOOLTIP_MAX_CHARS);

    renderCell(longValue);

    const expand = screen.getByTestId('workflowExecutionStepDataValueExpand');
    expect(expand).toBeInTheDocument();
    // Truncated preview is present; no role=tooltip content until hover on short values only.
    expect(screen.queryByTestId('workflowExecutionStepDataValueExpanded')).not.toBeInTheDocument();

    fireEvent.click(expand);

    expect(screen.getByTestId('workflowExecutionStepDataValueExpanded')).toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionStepDataValueCopy')).toBeInTheDocument();
    expect(screen.getByText(longValue)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('workflowExecutionStepDataValueCollapse'));

    expect(screen.queryByTestId('workflowExecutionStepDataValueExpanded')).not.toBeInTheDocument();
    expect(screen.getByTestId('workflowExecutionStepDataValueExpand')).toBeInTheDocument();
  });

  it('treats values at the tooltip threshold as short', () => {
    renderCell('y'.repeat(VALUE_TOOLTIP_MAX_CHARS));
    expect(screen.queryByTestId('workflowExecutionStepDataValueExpand')).not.toBeInTheDocument();
  });
});
