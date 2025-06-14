/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { buildCasesPermissions, renderWithTestingProviders } from '../../common/mock';

import { ObservableActionsPopoverButton } from './observable_actions_popover_button';
import type { CaseUI } from '../../../common';
import type { Observable } from '../../../common/types/domain/observable/v1';
import { mockCase } from '../../containers/mock';
import { usePostObservable } from '../../containers/use_post_observables';
import { useDeleteObservable } from '../../containers/use_delete_observables';

jest.mock('../../containers/use_post_observables');
jest.mock('../../containers/use_delete_observables');

describe('ObservableActionsPopoverButton', () => {
  const addObservable = jest.fn().mockResolvedValue({});
  const deleteObservable = jest.fn().mockResolvedValue({});

  const caseData: CaseUI = { ...mockCase };
  const observable = { id: '05041f40-ac9f-4192-b367-7e6a5dafcee5' } as Observable;

  beforeEach(() => {
    jest
      .mocked(usePostObservable)
      .mockReturnValue({ mutateAsync: addObservable, isLoading: false } as unknown as ReturnType<
        typeof usePostObservable
      >);
    jest
      .mocked(useDeleteObservable)
      .mockReturnValue({ mutateAsync: deleteObservable, isLoading: false } as unknown as ReturnType<
        typeof useDeleteObservable
      >);
    jest.clearAllMocks();
  });

  it('renders observable actions popover button correctly', async () => {
    renderWithTestingProviders(
      <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
    );

    expect(
      await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
    ).toBeInTheDocument();
  });

  it('clicking the button opens the popover', async () => {
    renderWithTestingProviders(
      <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
    );

    await userEvent.click(
      await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
    );

    expect(
      await screen.findByTestId(`cases-observables-popover-${observable.id}`)
    ).toBeInTheDocument();
    expect(await screen.findByTestId('cases-observables-delete-button')).toBeInTheDocument();
    expect(await screen.findByTestId('cases-observables-edit-button')).toBeInTheDocument();
  });

  describe('edit buttton', () => {
    it('clicking edit button opens the edit modal', async () => {
      renderWithTestingProviders(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-observables-edit-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('case-observables-edit-modal')).toBeInTheDocument();
    });
  });

  describe('delete button', () => {
    it('clicking delete button opens the confirmation modal', async () => {
      renderWithTestingProviders(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-observables-delete-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    });

    it('clicking delete button in the confirmation modal calls deleteObservable with proper params', async () => {
      renderWithTestingProviders(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      await userEvent.click(await screen.findByTestId('cases-observables-delete-button'), {
        pointerEventsCheck: 0,
      });

      expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

      await userEvent.click(await screen.findByTestId('confirmModalConfirmButton'));

      await waitFor(() => {
        expect(deleteObservable).toHaveBeenCalledTimes(1);
      });
    });

    it('delete button is not rendered if user has no update permission', async () => {
      renderWithTestingProviders(
        <ObservableActionsPopoverButton caseData={caseData} observable={observable} />,
        { wrapperProps: { permissions: buildCasesPermissions({ update: false }) } }
      );

      await userEvent.click(
        await screen.findByTestId(`cases-observables-actions-popover-button-${observable.id}`)
      );

      expect(screen.queryByTestId('cases-observables-delete-button')).not.toBeInTheDocument();
    });
  });
});
