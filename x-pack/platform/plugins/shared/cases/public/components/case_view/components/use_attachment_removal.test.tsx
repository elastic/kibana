/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestProviders, noDeleteCasesPermissions } from '../../../common/mock';
import { useBulkDeleteAttachments } from '../../../containers/use_bulk_delete_attachments';
import { useAttachmentRemoval } from './use_attachment_removal';

jest.mock('../../../containers/use_bulk_delete_attachments');

const useBulkDeleteAttachmentsMock = useBulkDeleteAttachments as jest.Mock;

describe('useAttachmentRemoval', () => {
  const caseId = 'case-1';
  const mutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useBulkDeleteAttachmentsMock.mockReturnValue({ mutate });
  });

  const renderRemoval = () =>
    renderHook(() => useAttachmentRemoval(caseId), { wrapper: TestProviders });

  const renderModal = (modal: React.ReactNode) => render(<TestProviders>{modal}</TestProviders>);

  it('allows removal when the user can delete', () => {
    expect(renderRemoval().result.current.canRemove).toBe(true);
  });

  it('does not allow removal without the delete permission', () => {
    const { result } = renderHook(() => useAttachmentRemoval(caseId), {
      wrapper: (props) => <TestProviders {...props} permissions={noDeleteCasesPermissions()} />,
    });

    expect(result.current.canRemove).toBe(false);
  });

  it('confirms with the count label of the type before removing referenced ids', async () => {
    const onSuccess = jest.fn();
    const { result } = renderRemoval();

    act(() => {
      result.current.onRemove({
        id: 'security.alert',
        getCountLabel: ({ count }) => `${count} alerts`,
      })({ attachmentIds: ['alert-1', 'alert-2'] }, { onSuccess });
    });

    renderModal(result.current.modal);
    expect(screen.getByText('Remove 2 alerts?')).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mutate).toHaveBeenCalledWith(
      {
        request: { type: 'security.alert', attachmentIds: ['alert-1', 'alert-2'] },
        countLabel: '2 alerts',
      },
      { onSuccess }
    );
  });

  describe('when the type has related removals', () => {
    const attackType = {
      id: 'security.attack',
      getCountLabel: ({ count }: { count: number }) => `${count} attacks`,
      getRelatedRemoval: ({ count }: { count: number }) => ({
        description: `Also remove the alerts of ${count} attacks?`,
        removeOnlyLabel: 'Remove attacks only',
        removeWithRelatedLabel: 'Remove attacks and alerts',
      }),
    };

    const openModal = () => {
      const { result } = renderRemoval();
      act(() => {
        result.current.onRemove(attackType)({ attachmentIds: ['attack-1', 'attack-2'] });
      });
      renderModal(result.current.modal);
    };

    it('asks whether to remove the related attachments too', () => {
      openModal();

      expect(screen.getByText('Remove 2 attacks?')).toBeInTheDocument();
      expect(screen.getByTestId('remove-with-related-modal-description')).toHaveTextContent(
        'Also remove the alerts of 2 attacks?'
      );
      expect(screen.queryByTestId('property-actions-confirm-modal')).toBeNull();
    });

    it('keeps the related attachments', async () => {
      openModal();

      await userEvent.click(screen.getByTestId('remove-with-related-modal-remove-only'));

      expect(mutate).toHaveBeenCalledWith(
        {
          request: { type: 'security.attack', attachmentIds: ['attack-1', 'attack-2'] },
          countLabel: '2 attacks',
          includeRelated: false,
        },
        { onSuccess: undefined }
      );
    });

    it('removes the related attachments too', async () => {
      openModal();

      await userEvent.click(screen.getByTestId('remove-with-related-modal-remove-with-related'));

      expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ includeRelated: true }), {
        onSuccess: undefined,
      });
    });

    it('removes nothing when the user cancels', async () => {
      openModal();

      await userEvent.click(screen.getByTestId('remove-with-related-modal-cancel'));

      expect(mutate).not.toHaveBeenCalled();
    });
  });

  it('deletes saved objects by id without sending the type', async () => {
    const { result } = renderRemoval();

    act(() => {
      result.current.onRemove({ id: 'file' })({ savedObjectIds: ['attachment-1'] });
    });

    renderModal(result.current.modal);
    expect(screen.getByText('Remove 1 attachment?')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(mutate).toHaveBeenCalledWith(
      { request: { ids: ['attachment-1'] }, countLabel: '1 attachment' },
      { onSuccess: undefined }
    );
  });

  it('removes nothing when the user cancels', async () => {
    const { result } = renderRemoval();

    act(() => {
      result.current.onRemove({ id: 'file' })({ savedObjectIds: ['attachment-1'] });
    });

    renderModal(result.current.modal);
    await userEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(mutate).not.toHaveBeenCalled();
    expect(result.current.modal).toBeNull();
  });

  it('does not open the modal for an empty request', () => {
    const { result } = renderRemoval();

    act(() => {
      result.current.onRemove({ id: 'file' })({ savedObjectIds: [] });
    });

    expect(result.current.modal).toBeNull();
  });

  it('ignores new removals while one is in progress', () => {
    useBulkDeleteAttachmentsMock.mockReturnValue({ mutate, isLoading: true });
    const { result } = renderRemoval();

    expect(result.current.isRemoving).toBe(true);

    act(() => {
      result.current.onRemove({ id: 'file' })({ savedObjectIds: ['attachment-1'] });
    });

    expect(result.current.modal).toBeNull();
  });
});
