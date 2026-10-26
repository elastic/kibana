/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertDeleteModal } from './modal';
import * as i18n from '../translations';
import { httpServiceMock, notificationServiceMock } from '@kbn/core/public/mocks';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { IHttpFetchError, ResponseErrorBody } from '@kbn/core/public';

const http = httpServiceMock.createStartContract();
const notifications = notificationServiceMock.createStartContract();

jest.mock('@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting', () => ({
  useUiSetting: jest.fn().mockImplementation((_, defaultValue) => defaultValue),
}));

const lastRunDate = '2025-10-01T02:10:23.000Z';
const mockHttpGet = ({ lastRun = lastRunDate, affectedAlertCount = 0 }) => {
  http.get.mockClear();
  http.get.mockImplementation(async (path: any) => {
    if (path.includes('_last_run')) {
      return { last_run: lastRun };
    }
    if (path.includes('_preview')) {
      return { affected_alert_count: affectedAlertCount };
    }
    throw new Error(`No mock implementation for GET ${path}`);
  });
};

describe('AlertDelete Modal', () => {
  const closeModalMock = jest.fn();
  const servicesMock = { http, notifications };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        cacheTime: 0,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    closeModalMock.mockClear();
    mockHttpGet({ lastRun: lastRunDate, affectedAlertCount: 0 });
  });

  it('renders the modal with initial state', async () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    expect(screen.getByText(i18n.MODAL_TITLE)).toBeInTheDocument();
    expect(screen.getByText(i18n.MODAL_DESCRIPTION)).toBeInTheDocument();
    expect(screen.getByText(i18n.ACTIVE_ALERTS)).toBeInTheDocument();
    expect(screen.getByText(i18n.INACTIVE_ALERTS)).toBeInTheDocument();
    expect(screen.getByTestId('alert-delete-active-threshold')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-active-threshold-unit')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold-unit')).toBeDisabled();
    expect(screen.getByTestId('alert-delete-preview-message').textContent).toEqual(
      'Select the type of alerts you wish to delete'
    );
  });

  it('enables the active alerts threshold when the checkbox is checked', async () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    expect(activeCheckbox).toBeChecked();
    expect(screen.getByTestId('alert-delete-active-threshold')).not.toBeDisabled();
    expect(screen.getByTestId('alert-delete-active-threshold-unit')).not.toBeDisabled();
  });

  it('enables the inactive alerts threshold when the checkbox is checked', () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const inactiveCheckbox = screen.getByTestId('alert-delete-inactive-checkbox');
    fireEvent.click(inactiveCheckbox);

    expect(inactiveCheckbox).toBeChecked();
    expect(screen.getByTestId('alert-delete-inactive-threshold')).not.toBeDisabled();
    expect(screen.getByTestId('alert-delete-inactive-threshold-unit')).not.toBeDisabled();
  });

  it('validates the delete confirmation input', async () => {
    mockHttpGet({ affectedAlertCount: 100 });

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        categoryIds={['management']}
        services={servicesMock}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: 'wrong-passkey' } });

    expect(deleteInput).toHaveValue('wrong-passkey');
    expect(screen.getByTestId('alert-delete-submit')).toBeDisabled();

    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });
    expect(deleteInput).toHaveValue(i18n.DELETE_PASSKEY);

    await waitFor(() =>
      expect(screen.getByTestId('alert-delete-preview-message').textContent).toContain('100 alerts')
    );

    expect(screen.getByTestId('alert-delete-submit')).not.toBeDisabled();
  });

  it('calls closeModal when the cancel button is clicked', () => {
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(closeModalMock).toHaveBeenCalledTimes(1);
  });

  it('enables the submit button the form when all validations passes', async () => {
    mockHttpGet({ affectedAlertCount: 100 });

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = await screen.findByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    fireEvent.click(submitButton);

    await waitFor(() => expect(submitButton).not.toBeDisabled());
  });

  it('disables the submit button when no alert would be deleted with current settings', async () => {
    mockHttpGet({ affectedAlertCount: 0 });

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const submitButton = screen.getByTestId('alert-delete-submit');
    fireEvent.click(submitButton);

    await waitFor(() =>
      expect(screen.getByTestId('alert-delete-preview-message').textContent).toContain(
        'No alerts match the selected criteria.'
      )
    );
    expect(submitButton).toBeDisabled();
  });

  it('shows a success toast and closes the modal on successful schedule submission', async () => {
    mockHttpGet({ affectedAlertCount: 100 });
    http.post.mockResolvedValueOnce(null);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(i18n.ALERT_DELETE_SUCCESS);
      expect(closeModalMock).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a warning toast when schedule returns a message', async () => {
    mockHttpGet({ affectedAlertCount: 100 });
    http.post.mockResolvedValueOnce(`task is already running!`);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addInfo).toHaveBeenCalledWith(`task is already running!`);
      expect(closeModalMock).toHaveBeenCalledTimes(1);
    });
  });

  it('doesnt include a threshold that has been activated and then deactivated', async () => {
    mockHttpGet({ affectedAlertCount: 100 });
    http.post.mockResolvedValueOnce(null);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const inactiveCheckbox = screen.getByTestId('alert-delete-inactive-checkbox');
    fireEvent.click(inactiveCheckbox);

    // deactivates because this state isn't the same as the initial state
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addSuccess).toHaveBeenCalledWith(i18n.ALERT_DELETE_SUCCESS);
      expect(closeModalMock).toHaveBeenCalledTimes(1);
    });

    expect(http.post).toHaveBeenCalledWith(
      '/internal/alerting/rules/settings/_alert_delete_schedule',
      expect.objectContaining({
        body: JSON.stringify({
          active_alert_delete_threshold: undefined,
          inactive_alert_delete_threshold: 90,
          category_ids: ['management'],
        }),
      })
    );
  });
});

describe('AlertDelete Modal Error Handling', () => {
  const closeModalMock = jest.fn();
  const servicesMock = { http, notifications };

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        cacheTime: 0,
      },
    },
    logger: {
      // eslint-disable-next-line no-console
      log: console.log,
      // eslint-disable-next-line no-console
      warn: console.warn,
      error: () => {},
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <IntlProvider locale="en">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </IntlProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    closeModalMock.mockClear();
  });

  it('shows an error toast on schedule submission failure', async () => {
    mockHttpGet({ affectedAlertCount: 100 });
    const mockError: IHttpFetchError<ResponseErrorBody> = {
      body: {
        message: 'Request failed',
        statusCode: 500,
      },
      name: 'Error',
      request: {} as unknown as Request,
      message: 'Internal Server Error',
    };
    http.post.mockRejectedValueOnce(mockError);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalled();
    });
    expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
      title: i18n.ALERT_DELETE_FAILURE,
      text: 'Request failed',
    });
    expect(closeModalMock).toHaveBeenCalledTimes(0);
  });

  it('shows a generic error toast if the error response does not have a message', async () => {
    mockHttpGet({ affectedAlertCount: 100 });
    const errorResponse = {};
    http.post.mockRejectedValueOnce(errorResponse);

    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    const activeCheckbox = screen.getByTestId('alert-delete-active-checkbox');
    fireEvent.click(activeCheckbox);

    const deleteInput = screen.getByTestId('alert-delete-delete-confirmation');
    fireEvent.change(deleteInput, { target: { value: i18n.DELETE_PASSKEY } });

    const submitButton = screen.getByTestId('alert-delete-submit');
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(notifications.toasts.addDanger).toHaveBeenCalledWith({
        title: i18n.ALERT_DELETE_FAILURE,
        text: 'Unknown error',
      });
    });
  });

  it('should show the last run date', async () => {
    mockHttpGet({ lastRun: lastRunDate });
    render(
      <AlertDeleteModal
        onCloseModal={closeModalMock}
        isVisible
        services={servicesMock}
        categoryIds={['management']}
      />,
      { wrapper }
    );

    await waitFor(() => {
      const lastRunTextContent = screen.getByTestId('alert-delete-last-run').textContent;
      const lastRunDateContent = lastRunTextContent?.replace('Last cleanup task: ', '') ?? '';
      expect(new Date(lastRunDateContent).toISOString()).toEqual(lastRunDate);
    });
  });
});
