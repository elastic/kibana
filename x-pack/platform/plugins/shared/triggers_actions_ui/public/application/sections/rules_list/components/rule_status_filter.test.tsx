/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { RuleStatusFilter } from './rule_status_filter';

const onChangeMock = jest.fn();

describe('RuleStatusFilter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const { container } = renderWithI18n(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    expect(screen.queryByTestId('ruleStatusFilterSelect')).not.toBeInTheDocument();
    expect(screen.getByTestId('ruleStatusFilterButton')).toBeInTheDocument();

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toHaveTextContent('0');
  });

  it('can open the popover correctly', async () => {
    renderWithI18n(<RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />);

    expect(screen.queryByTestId('ruleStatusFilterSelect')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('ruleStatusFilterButton'));

    const selectContainer = screen.getByTestId('ruleStatusFilterSelect');
    const statusItems = within(selectContainer).getAllByRole('option');
    expect(statusItems.length).toEqual(3);
  });

  it('can select statuses', async () => {
    const { rerender } = renderWithI18n(
      <RuleStatusFilter selectedStatuses={[]} onChange={onChangeMock} />
    );

    await userEvent.click(screen.getByTestId('ruleStatusFilterButton'));

    await userEvent.click(screen.getByTestId('ruleStatusFilterOption-enabled'), {
      pointerEventsCheck: 0,
    });
    expect(onChangeMock).toHaveBeenCalledWith(['enabled']);

    rerender(
      <I18nProvider>
        <RuleStatusFilter selectedStatuses={['enabled']} onChange={onChangeMock} />
      </I18nProvider>
    );

    await userEvent.click(screen.getByTestId('ruleStatusFilterOption-enabled'), {
      pointerEventsCheck: 0,
    });
    expect(onChangeMock).toHaveBeenCalledWith([]);

    await userEvent.click(screen.getByTestId('ruleStatusFilterOption-disabled'), {
      pointerEventsCheck: 0,
    });
    expect(onChangeMock).toHaveBeenCalledWith(['enabled', 'disabled']);
  });
});
