/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { waitFor, renderHook, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import AllCasesSelectorModal from '.';
import type { CaseUI } from '../../../../common';
import { CaseStatuses } from '../../../../common/types/domain';
import { allCasesPermissions, renderWithTestingProviders } from '../../../common/mock';
import { useCasesToast } from '../../../common/use_cases_toast';
import { alertComment } from '../../../containers/mock';
import { useCreateAttachments } from '../../../containers/use_create_attachments';
import { CasesContext } from '../../cases_context';
import { CasesContextStoreActionsList } from '../../cases_context/state/cases_context_reducer';
import type { AddToExistingCaseModalProps } from './use_cases_add_to_existing_case_modal';
import { useCasesAddToExistingCaseModal } from './use_cases_add_to_existing_case_modal';
import { UnifiedAttachmentTypeRegistry } from '../../../client/attachment_framework/unified_attachment_registry';
import { useAttachEventsEBT } from '../../../analytics/use_attach_events_ebt';
import { useCasesAddToNewCaseFlyout } from '../../create/flyout/use_cases_add_to_new_case_flyout';

vi.mock('../../../analytics/use_attach_events_ebt');
vi.mock('../../../common/use_cases_toast');
vi.mock('../../../common/lib/kibana/use_application');
vi.mock('../../../containers/use_create_attachments');
vi.mock('../../create/flyout/use_cases_add_to_new_case_flyout');
// dummy mock, will call onRowclick when rendering
vi.mock('./all_cases_selector_modal', () => {
  return {
    AllCasesSelectorModal: vi.fn(),
  };
});

const onSuccess = vi.fn();
const getAttachments = vi.fn().mockReturnValue([alertComment]);
const useCasesToastMock = useCasesToast as Mock;
const useCasesAddToNewCaseFlyoutMock = useCasesAddToNewCaseFlyout as Mock;
const AllCasesSelectorModalMock = AllCasesSelectorModal as unknown as Mock;
const openCreateNewCaseFlyout = vi.fn();

// test component to test the hook integration
const TestComponent: React.FC<AddToExistingCaseModalProps> = (
  props: AddToExistingCaseModalProps = {}
) => {
  const hook = useCasesAddToExistingCaseModal({ onSuccess, ...props });

  const onClick = () => {
    hook.open({ getAttachments });
  };

  return <button type="button" data-test-subj="open-modal" onClick={onClick} />;
};

const useCreateAttachmentsMock = useCreateAttachments as Mock;

const unifiedAttachmentTypeRegistry = new UnifiedAttachmentTypeRegistry();

describe('use cases add to existing case modal hook', () => {
  useCreateAttachmentsMock.mockReturnValue({
    mutateAsync: vi.fn(),
  });

  const dispatch = vi.fn();

  const wrapper: FC<PropsWithChildren<unknown>> = ({ children }) => {
    return (
      <CasesContext.Provider
        value={{
          unifiedAttachmentTypeRegistry,
          owner: ['test'],
          permissions: allCasesPermissions(),
          basePath: '/jest',
          dispatch,
          features: {
            alerts: { read: true, all: true },
            metrics: [],
          },
          releasePhase: 'ga',
        }}
      >
        {children}
      </CasesContext.Provider>
    );
  };

  const defaultParams = () => {
    return { onSuccess };
  };

  beforeEach(() => {
    dispatch.mockReset();
    AllCasesSelectorModalMock.mockReset();
    openCreateNewCaseFlyout.mockReset();
    useCasesAddToNewCaseFlyoutMock.mockReturnValue({
      close: vi.fn(),
      open: openCreateNewCaseFlyout,
    });
    onSuccess.mockReset();
  });

  it('should throw if called outside of a cases context', () => {
    expect(() =>
      renderHook(() => {
        useCasesAddToExistingCaseModal(defaultParams());
      })
    ).toThrow(/useCasesContext must be used within a CasesProvider and have a defined value/);
  });

  it('should dispatch the open action when invoked', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToExistingCaseModal(defaultParams());
      },
      { wrapper }
    );
    result.current.open({ getAttachments: () => [] });
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.OPEN_ADD_TO_CASE_MODAL,
        payload: expect.objectContaining({
          hiddenStatuses: [CaseStatuses.closed],
        }),
      })
    );
  });

  it('should dispatch the close action for modal and flyout when invoked', () => {
    const { result } = renderHook(
      () => {
        return useCasesAddToExistingCaseModal(defaultParams());
      },
      { wrapper }
    );
    result.current.close();
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.CLOSE_ADD_TO_CASE_MODAL,
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: CasesContextStoreActionsList.CLOSE_CREATE_CASE_FLYOUT,
      })
    );
  });

  it('should call getAttachments with the case info', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    renderWithTestingProviders(<TestComponent />);
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(getAttachments).toHaveBeenCalledTimes(1);
    });

    expect(getAttachments).toHaveBeenCalledWith({ theCase: { id: 'test', owner: 'cases' } });
  });

  it('should forward create case flyout options when creating from the selector', async () => {
    const headerContent = <div>{'Attack discovery'}</div>;
    const initialValue = {
      description: 'Attack discovery details',
      title: 'Attack discovery title',
    };
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick();
      return null;
    });

    renderWithTestingProviders(
      <TestComponent createCaseFlyout={{ headerContent, initialValue }} />
    );
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(openCreateNewCaseFlyout).toHaveBeenCalledWith({
        headerContent,
        getAttachments: expect.any(Function),
      });
    });
    const { getAttachments: flyoutGetAttachments } = openCreateNewCaseFlyout.mock.calls[0][0];
    expect(flyoutGetAttachments('cases')).toEqual([alertComment]);
    expect(useCasesAddToNewCaseFlyoutMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialValue })
    );

    const createdCase = { id: 'created-case', owner: 'cases' } as CaseUI;
    const createCaseOnSuccess = useCasesAddToNewCaseFlyoutMock.mock.calls[0][0].onSuccess;
    act(() => {
      createCaseOnSuccess(createdCase);
    });
    expect(onSuccess).toHaveBeenCalledWith(createdCase, true);
  });

  it('should show a toaster info when no attachments are defined and noAttachmentsToaster is defined', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    getAttachments.mockReturnValueOnce([]);

    const mockedToastInfo = vi.fn();
    useCasesToastMock.mockReturnValue({
      showInfoToast: mockedToastInfo,
    });

    renderWithTestingProviders(
      <TestComponent noAttachmentsToaster={{ title: 'My title', content: 'My content' }} />
    );
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockedToastInfo).toHaveBeenCalledWith('My title', 'My content');
    });
  });

  it('should show a toaster info when no attachments are defined and noAttachmentsToaster is not defined', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    getAttachments.mockReturnValueOnce([]);

    const mockedToastInfo = vi.fn();
    useCasesToastMock.mockReturnValue({
      showInfoToast: mockedToastInfo,
    });

    renderWithTestingProviders(<TestComponent />);
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockedToastInfo).toHaveBeenCalledWith('No attachments added to the case', undefined);
    });
  });

  it('should call createAttachments when a case is selected and show a toast message', async () => {
    const mockBulkCreateAttachments = vi.fn();
    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToastSuccess = vi.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    renderWithTestingProviders(<TestComponent />);
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockBulkCreateAttachments).toHaveBeenCalledTimes(1);
    });

    expect(mockBulkCreateAttachments).toHaveBeenCalledWith({
      caseId: 'test',
      caseOwner: 'cases',
      attachments: [alertComment],
    });
    expect(mockedToastSuccess).toHaveBeenCalled();

    expect(vi.mocked(useAttachEventsEBT())).toHaveBeenCalled();
  });

  it('should report an existing case when onSuccess is called after case selection', async () => {
    const mockBulkCreateAttachments = vi.fn();

    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToastSuccess = vi.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    renderWithTestingProviders(<TestComponent />);
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith({ id: 'test', owner: 'cases' }, false);
    });
  });

  it('should not call createAttachments nor show toast success when a case is not selected', async () => {
    const mockBulkCreateAttachments = vi.fn();
    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToastSuccess = vi.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToastSuccess,
    });

    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      return null;
    });

    renderWithTestingProviders(<TestComponent />);

    await userEvent.click(screen.getByTestId('open-modal'));
    // give a small delay for the reducer to run

    act(() => {
      expect(mockBulkCreateAttachments).not.toHaveBeenCalled();
      expect(mockedToastSuccess).not.toHaveBeenCalled();
    });
  });

  it('should lazily resolve owner-dependent attachments when creating a new case from the modal', async () => {
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      // user clicked "create new case" inside the "add to existing case" modal
      onRowClick(undefined);
      return null;
    });

    // an owner-dependent getAttachments, like ML's or Osquery's, that can only build
    // the correct unified attachment once the (new) case's owner is known
    const ownerDependentGetAttachments = vi
      .fn()
      .mockImplementation(({ theCase }: { theCase?: CaseUI }) => (theCase ? [alertComment] : []));

    const TestComponentWithOwnerDependentAttachments: React.FC<AddToExistingCaseModalProps> = (
      props
    ) => {
      const hook = useCasesAddToExistingCaseModal({ onSuccess, ...props });
      const onClick = () => {
        hook.open({ getAttachments: ownerDependentGetAttachments });
      };
      return <button type="button" data-test-subj="open-modal" onClick={onClick} />;
    };

    renderWithTestingProviders(<TestComponentWithOwnerDependentAttachments />);
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(openCreateNewCaseFlyout).toHaveBeenCalledWith({
        getAttachments: expect.any(Function),
      });
    });

    const { getAttachments: flyoutGetAttachments } = openCreateNewCaseFlyout.mock.calls[0][0];

    // the flyout only knows the owner once the case is created; the modal must
    // forward that owner back to the caller's getAttachments instead of the
    // empty array it would have eagerly resolved with theCase === undefined
    expect(flyoutGetAttachments('cases')).toEqual([alertComment]);
    expect(ownerDependentGetAttachments).toHaveBeenCalledWith({ theCase: { owner: 'cases' } });
  });

  it('should not show toast success when a case is selected with attachments and fails to update attachments', async () => {
    const mockBulkCreateAttachments = vi.fn().mockRejectedValue(new Error('Impossible'));
    useCreateAttachmentsMock.mockReturnValueOnce({
      mutateAsync: mockBulkCreateAttachments,
    });

    const mockedToast = vi.fn();
    useCasesToastMock.mockReturnValue({
      showSuccessAttach: mockedToast,
    });

    // simulate a case selected
    AllCasesSelectorModalMock.mockImplementation(({ onRowClick }) => {
      onRowClick({ id: 'test', owner: 'cases' } as CaseUI);
      return null;
    });

    renderWithTestingProviders(<TestComponent />);
    await userEvent.click(screen.getByTestId('open-modal'));

    await waitFor(() => {
      expect(mockBulkCreateAttachments).toHaveBeenCalledWith({
        caseId: 'test',
        caseOwner: 'cases',
        attachments: [alertComment],
      });
    });

    act(() => {
      expect(mockBulkCreateAttachments).toHaveBeenCalled();
      expect(mockedToast).not.toHaveBeenCalled();
    });
  });
});
