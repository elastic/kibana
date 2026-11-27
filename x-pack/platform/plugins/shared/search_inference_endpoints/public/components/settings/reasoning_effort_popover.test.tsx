/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import type { ReasoningEffortLevel } from '../../../common/types';
import { ReasoningEffortPopover } from './reasoning_effort_popover';

const onChange = jest.fn();

const renderPopover = (
  effort?: ReasoningEffortLevel,
  supportedLevels: ReasoningEffortLevel[] = ['low', 'medium', 'high']
) =>
  render(
    <EuiThemeProvider>
      <I18nProvider>
        <ReasoningEffortPopover
          endpointId="ep-1"
          label="Claude"
          effort={effort}
          supportedLevels={supportedLevels}
          onChange={onChange}
        />
      </I18nProvider>
    </EuiThemeProvider>
  );

describe('ReasoningEffortPopover', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the add effort control when no effort is set', () => {
    renderPopover();

    expect(screen.getByTestId('add-effort-ep-1')).toBeInTheDocument();
    expect(screen.queryByTestId('effort-badge-ep-1')).not.toBeInTheDocument();
  });

  it('offers only the supported effort levels', () => {
    renderPopover();

    fireEvent.click(screen.getByTestId('add-effort-ep-1'));

    expect(screen.getByTestId('reasoningEffort-low')).toBeInTheDocument();
    expect(screen.getByTestId('reasoningEffort-high')).toBeInTheDocument();
    expect(screen.queryByTestId('reasoningEffort-none')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reasoningEffort-xhigh')).not.toBeInTheDocument();
  });

  it('calls onChange with the selected level', () => {
    renderPopover();

    fireEvent.click(screen.getByTestId('add-effort-ep-1'));
    fireEvent.click(screen.getByTestId('reasoningEffort-high'));

    expect(onChange).toHaveBeenCalledWith('high');
  });

  it('hides the remove action when no effort is set', () => {
    renderPopover();

    fireEvent.click(screen.getByTestId('add-effort-ep-1'));

    expect(screen.queryByTestId('remove-effort-customization')).not.toBeInTheDocument();
  });

  it('clears the effort when the customization is removed', () => {
    renderPopover('medium');

    fireEvent.click(screen.getByTestId('effort-badge-ep-1'));
    fireEvent.click(screen.getByTestId('remove-effort-customization'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
