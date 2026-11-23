/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { coreMock } from '@kbn/core/public/mocks';
import type { ErrorToastInput } from './show_error_toast';
import { showErrorToast } from './show_error_toast';

const mountedNodes: ReactElement[] = [];

jest.mock('@kbn/react-kibana-mount', () => ({
  toMountPoint: (node: ReactElement) => {
    mountedNodes.push(node);
    return () => () => {};
  },
}));

const INPUT: ErrorToastInput = {
  title: 'Unable to delete boost profile "catalog-fast"',
  details: {
    description: "Couldn't delete 1 of the 2 rules that use it, so the profile was kept.",
    nameColumn: 'Boost rule',
    failures: [
      { name: 'catalog-search', status: '504 Gateway Timeout', reason: 'Request timed out' },
    ],
  },
};

const setup = (input: Partial<ErrorToastInput> = {}) => {
  const services = coreMock.createStart();
  const modal = { close: jest.fn(), onClose: Promise.resolve() };
  services.overlays.openModal.mockReturnValue(modal);
  const toast = showErrorToast(services, { ...INPUT, ...input });
  const [toastInput] = services.notifications.toasts.addDanger.mock.calls[0];
  const openDetails = () => {
    if (typeof toastInput === 'string') {
      throw new Error('Expected a toast with actions');
    }
    const onClick = toastInput.actionProps?.primary?.onClick;
    onClick?.({} as never);
    const node = mountedNodes[mountedNodes.length - 1];
    render(node);
  };
  return { services, modal, toast, toastInput, openDetails };
};

describe('showErrorToast', () => {
  beforeEach(() => {
    mountedNodes.length = 0;
  });

  it('shows a danger toast with "View details"', () => {
    const { toastInput } = setup();

    expect(toastInput).toEqual(
      expect.objectContaining({
        title: INPUT.title,
        actionProps: {
          primary: expect.objectContaining({ children: 'View details' }),
        },
      })
    );
  });

  it('opens "What went wrong" with each failed item and its reason', () => {
    const { services, openDetails } = setup();

    openDetails();

    expect(services.overlays.openModal).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ 'data-test-subj': 'searchBoostErrorDetailsModal' })
    );
    expect(screen.getByText('What went wrong')).toBeInTheDocument();
    expect(screen.getByTestId('searchBoostErrorDetailsDescription').textContent).toBe(
      INPUT.details.description
    );
    const table = screen.getByTestId('searchBoostErrorDetailsTable');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    ).toEqual(['Boost rule', 'Error', 'Reason']);
    expect(
      screen.getAllByTestId('searchBoostErrorDetailsTableRow').map((row) => row.textContent)
    ).toEqual(['catalog-search504 Gateway TimeoutRequest timed out']);
    expect(screen.queryByTestId('searchBoostErrorDetailsTryAgain')).not.toBeInTheDocument();
  });

  it('tries again from the details, closing the modal and the toast', async () => {
    const onRetry = jest.fn();
    const { services, modal, toast, openDetails } = setup({ onRetry });

    openDetails();
    await userEvent.click(screen.getByTestId('searchBoostErrorDetailsTryAgain'));

    expect(modal.close).toHaveBeenCalled();
    expect(services.notifications.toasts.remove).toHaveBeenCalledWith(toast);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('closes the details', async () => {
    const { modal, openDetails } = setup();

    openDetails();
    await userEvent.click(screen.getByTestId('searchBoostErrorDetailsClose'));

    expect(modal.close).toHaveBeenCalled();
  });

  it('shows the error column without names for a single failure', () => {
    const { openDetails } = setup({
      details: {
        description: 'An error prevented this profile from being deleted.',
        failures: [{ reason: 'Failed to fetch' }],
      },
    });

    openDetails();

    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Error',
      'Reason',
    ]);
    expect(
      screen.getAllByTestId('searchBoostErrorDetailsTableRow').map((row) => row.textContent)
    ).toEqual(['—Failed to fetch']);
  });
});
