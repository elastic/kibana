/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';
import { RuleStatusFilter } from './rule_status_filter';

const onChangeMock = jest.fn();

describe('RuleStatusFilter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const { container } = renderWithKibanaRenderContext(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    // Popover not open — selectable list items not visible
    expect(screen.queryByTestId('ruleStatusFilterSelect')).not.toBeInTheDocument();
    // Filter button is rendered
    expect(screen.getByTestId('ruleStatusFilterButton')).toBeInTheDocument();

    // Badge shows 0 active filters
    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toHaveTextContent('0');
  });

  it('can open the popover correctly', async () => {
    renderWithKibanaRenderContext(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    expect(screen.queryByTestId('ruleStatusFilterSelect')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleStatusFilterButton'));

    // 3 options should now be visible
    const selectContainer = screen.getByTestId('ruleStatusFilterSelect');
    const statusItems = within(selectContainer).getAllByRole('option');
    expect(statusItems.length).toEqual(3);
  });

  it('can select statuses', async () => {
    const { rerender } = renderWithKibanaRenderContext(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    await userEvent.click(screen.getByTestId('ruleStatusFilterButton'));

    // Click first option (enabled)
    await userEvent.click(screen.getByTestId('ruleStatusFilterOption-enabled'), {
      pointerEventsCheck: 0,
    });
    expect(onChangeMock).toHaveBeenCalledWith(['enabled']);

    // Re-render with updated props (simulates parent state update after selection)
    rerender(
      <EuiThemeProvider>
        <I18nProvider>
          <RuleStatusFilter selectedStatuses={['enabled']} onChange={onChangeMock} />
        </I18nProvider>
      </EuiThemeProvider>
    );

    // Click first option again to deselect
    await userEvent.click(screen.getByTestId('ruleStatusFilterOption-enabled'), {
      pointerEventsCheck: 0,
    });
    expect(onChangeMock).toHaveBeenCalledWith([]);

    // Click second option (disabled) — 'enabled' is still checked in DOM from last rerender
    await userEvent.click(screen.getByTestId('ruleStatusFilterOption-disabled'), {
      pointerEventsCheck: 0,
    });
    expect(onChangeMock).toHaveBeenCalledWith(['enabled', 'disabled']);
  });
});
