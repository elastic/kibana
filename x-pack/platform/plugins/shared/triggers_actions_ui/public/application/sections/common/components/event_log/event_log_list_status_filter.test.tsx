/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const { container } = render(
      <I18nProvider>
        <EventLogListStatusFilter selectedOptions={[]} onChange={onChangeMock} />
      </I18nProvider>
    );

    // No filter select items shown before popover is opened
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    // The filter button is rendered
    expect(screen.getByRole('button')).toBeInTheDocument();

    const badge = container.querySelector('.euiNotificationBadge');
    expect(badge?.textContent).toEqual('0');
  });

  it('can open the popover correctly', async () => {
    const { container, rerender } = render(
      <I18nProvider>
        <EventLogListStatusFilter selectedOptions={[]} onChange={onChangeMock} />
      </I18nProvider>
    );

    // Open the popover by clicking the filter button
    await userEvent.click(screen.getByRole('button'));

    // EUI popovers render in a portal (outside `container`), so use screen queries
    const statusItems = screen.getAllByRole('option');
    expect(statusItems.length).toEqual(4);

    await userEvent.click(statusItems[0]);
    expect(onChangeMock).toHaveBeenCalledWith(['success']);

    rerender(
      <I18nProvider>
        <EventLogListStatusFilter selectedOptions={['success']} onChange={onChangeMock} />
      </I18nProvider>
    );

    const badge1 = container.querySelector('.euiNotificationBadge');
    expect(badge1?.textContent).toEqual('1');

    await userEvent.click(statusItems[1]);
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
    expect(badge2?.textContent).toEqual('2');

    await userEvent.click(statusItems[0]);
    expect(onChangeMock).toHaveBeenCalledWith(['failure']);
  });
});
