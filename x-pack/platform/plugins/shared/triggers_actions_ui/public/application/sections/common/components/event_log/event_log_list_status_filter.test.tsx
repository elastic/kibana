/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { I18nProvider } from '@kbn/i18n-react';
import { EventLogListStatusFilter } from './event_log_list_status_filter';
import { getIsExperimentalFeatureEnabled } from '../../../../../common/get_experimental_features';

jest.mock('../../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));

beforeEach(() => {
  (getIsExperimentalFeatureEnabled as jest.Mock<any, any>).mockImplementation(() => false);
});

const onChangeMock = jest.fn();

describe('event_log_list_status_filter', () => {
  beforeEach(() => {
    onChangeMock.mockReset();
  });

  it('renders correctly', () => {
    const { container } = renderWithI18n(
      <EventLogListStatusFilter selectedOptions={[]} onChange={onChangeMock} />
    );

    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge).toHaveTextContent('0');
  });

  it('can open the popover correctly', async () => {
    const { container, rerender } = renderWithI18n(
      <EventLogListStatusFilter selectedOptions={[]} onChange={onChangeMock} />
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getAllByRole('option')).toHaveLength(4);

    await userEvent.click(screen.getAllByRole('option')[0]);
    expect(onChangeMock).toHaveBeenCalledWith(['success']);

    rerender(
      <I18nProvider>
        <EventLogListStatusFilter selectedOptions={['success']} onChange={onChangeMock} />
      </I18nProvider>
    );

    const badge1 = container.querySelector('.euiNotificationBadge');
    expect(badge1).toHaveTextContent('1');

    await userEvent.click(screen.getAllByRole('option')[1]);
    expect(onChangeMock).toHaveBeenCalledWith(['success', 'failure']);

    rerender(
      <I18nProvider>
        <EventLogListStatusFilter
          selectedOptions={['success', 'failure']}
          onChange={onChangeMock}
        />
      </I18nProvider>
    );

    const badge2 = container.querySelector('.euiNotificationBadge');
    expect(badge2).toHaveTextContent('2');

    await userEvent.click(screen.getAllByRole('option')[0]);
    expect(onChangeMock).toHaveBeenCalledWith(['failure']);
  });
});
