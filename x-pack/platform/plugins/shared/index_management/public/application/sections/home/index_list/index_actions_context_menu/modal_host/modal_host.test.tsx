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
import { ModalHost, type ModalHostHandles } from './modal_host';
import { act } from 'react-dom/test-utils';

jest.mock('../../../../../services/routing', () => ({
  ...jest.requireActual('../../../../../services/routing'),
  navigateToIndexDetailsPage: jest.fn(),
}));

jest.mock('../../../../../services/notification', () => ({
  ...jest.requireActual('../../../../../services/notification'),
  notificationService: { showSuccessToast: jest.fn(), showDangerToast: jest.fn() },
}));

jest.mock(
  '../../details_page/convert_to_lookup_index_modal/convert_to_lookup_index_modal_container',
  () => ({
    ...jest.requireActual(
      '../../details_page/convert_to_lookup_index_modal/convert_to_lookup_index_modal_container'
    ),
    ConvertToLookupIndexModalContainer: ({
      onCloseModal,
      onSuccess,
    }: {
      onCloseModal: () => void;
      onSuccess: (lookupIndexName: string) => void;
    }) => (
      <div data-test-subj="mockConvertToLookup">
        <button data-test-subj="convert-success" onClick={() => onSuccess('lookup-my-index')} />
        <button data-test-subj="convert-close" onClick={onCloseModal} />
      </div>
    ),
  })
);

const baseProps: React.ComponentProps<typeof ModalHost> = {
  indexNames: ['index-1'],
  indices: [{ name: 'index-1' }] as unknown as React.ComponentProps<typeof ModalHost>['indices'],
  indicesListURLParams: '',
  resetSelection: jest.fn(),
  forcemergeIndices: jest.fn(async (_: string) => {}),
  deleteIndices: jest.fn(async () => {}),
  reloadIndices: jest.fn(),
  extensionsService: {
    actions: [],
    columns: [],
    banners: [],
    toggles: [],
  } as unknown as React.ComponentProps<typeof ModalHost>['extensionsService'],
  getUrlForApp: jest.fn() as React.ComponentProps<typeof ModalHost>['getUrlForApp'],
  application: {} as React.ComponentProps<typeof ModalHost>['application'],
  http: {} as React.ComponentProps<typeof ModalHost>['http'],
};

const renderWithI18n = (ui: React.ReactElement) => {
  return render(<I18nProvider>{ui}</I18nProvider>);
};

describe('ModalHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('WHEN rendering and opening modals', () => {
    describe('AND WHEN opening FORCEMERGE modal', () => {
      it('SHOULD call forcemergeIndices with typed value', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'forcemerge' });
        });

        const input = (await screen.findByTestId(
          'indexActionsForcemergeNumSegments'
        )) as HTMLInputElement;
        await userEvent.type(input, '5');

        const confirm = await screen.findByTestId('confirmModalConfirmButton');
        await userEvent.click(confirm);

        expect(baseProps.forcemergeIndices).toHaveBeenCalledWith('5');
      });

      it('SHOULD block confirm when input is invalid', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'forcemerge' });
        });

        const input = (await screen.findByTestId(
          'indexActionsForcemergeNumSegments'
        )) as HTMLInputElement;
        await userEvent.clear(input);
        await userEvent.type(input, '0');

        const confirm = await screen.findByTestId('confirmModalConfirmButton');
        await userEvent.click(confirm);

        expect(baseProps.forcemergeIndices).not.toHaveBeenCalled();
      });

      it('SHOULD reset input state on reopen', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'forcemerge' });
        });
        const input = (await screen.findByTestId(
          'indexActionsForcemergeNumSegments'
        )) as HTMLInputElement;
        await userEvent.type(input, '7');

        await act(async () => {
          ref.current?.closeModal();
        });

        await act(async () => {
          ref.current?.openModal({ kind: 'forcemerge' });
        });
        const input2 = (await screen.findByTestId(
          'indexActionsForcemergeNumSegments'
        )) as HTMLInputElement;
        expect(input2.value).toBe('');
      });
    });

    describe('AND WHEN opening DELETE modal', () => {
      it('SHOULD close on cancel and reset selection', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'delete' });
        });
        const cancel = await screen.findByTestId('confirmModalCancelButton');
        await userEvent.click(cancel);

        expect(screen.queryByTestId('confirmModalCancelButton')).not.toBeInTheDocument();
        expect(baseProps.resetSelection).toHaveBeenCalled();
      });

      it('SHOULD call deleteIndices on confirm', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'delete' });
        });
        const confirm = await screen.findByTestId('confirmModalConfirmButton');
        await userEvent.click(confirm);

        expect(baseProps.deleteIndices).toHaveBeenCalledTimes(1);
      });
    });

    describe('AND WHEN opening EXTENSION modal', () => {
      it('SHOULD render extension modal and close via closeConfirmModal', async () => {
        const props: React.ComponentProps<typeof ModalHost> = {
          ...baseProps,
          extensionsService: {
            actions: [
              () => ({
                buttonLabel: 'Ext Modal',
                renderConfirmModal: (close: () => void) => (
                  <div data-test-subj="ext-modal">
                    <button data-test-subj="ext-close" onClick={close} />
                  </div>
                ),
              }),
            ],
          } as unknown as React.ComponentProps<typeof ModalHost>['extensionsService'],
        };

        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...props} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'extension', actionIndex: 0 });
        });
        expect(await screen.findByTestId('ext-modal')).toBeInTheDocument();

        const closeBtn = await screen.findByTestId('ext-close');
        await userEvent.click(closeBtn);

        expect(screen.queryByTestId('ext-modal')).not.toBeInTheDocument();
        expect(props.resetSelection).toHaveBeenCalled();
      });
    });

    describe('AND WHEN opening CONVERT TO LOOKUP modal', () => {
      it('SHOULD render the container shell', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'convertToLookup' });
        });
        expect(await screen.findByTestId('mockConvertToLookup')).toBeInTheDocument();
      });

      it('SHOULD navigate and toast on success', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'convertToLookup' });
        });

        const success = await screen.findByTestId('convert-success');
        await userEvent.click(success);

        const { navigateToIndexDetailsPage } = jest.requireMock(
          '../../../../../services/routing'
        ) as { navigateToIndexDetailsPage: jest.Mock };
        const { notificationService } = jest.requireMock(
          '../../../../../services/notification'
        ) as { notificationService: { showSuccessToast: jest.Mock } };

        expect(navigateToIndexDetailsPage).toHaveBeenCalled();
        expect(notificationService.showSuccessToast).toHaveBeenCalled();
      });

      it('SHOULD close on cancel and reset selection', async () => {
        const ref = React.createRef<ModalHostHandles>();
        renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

        await act(async () => {
          ref.current?.openModal({ kind: 'convertToLookup' });
        });

        const cancel = await screen.findByTestId('convert-close');
        await userEvent.click(cancel);

        expect(screen.queryByTestId('mockConvertToLookup')).not.toBeInTheDocument();
        expect(baseProps.resetSelection).toHaveBeenCalled();
      });
    });
  });

  describe('WHEN calling imperative API directly', () => {
    it('SHOULD close any open modal on closeModal()', async () => {
      const ref = React.createRef<ModalHostHandles>();
      renderWithI18n(<ModalHost ref={ref} {...baseProps} />);

      await act(async () => {
        ref.current?.openModal({ kind: 'delete' });
      });
      expect(await screen.findByTestId('confirmModalConfirmButton')).toBeInTheDocument();

      await act(async () => {
        ref.current?.closeModal();
      });
      expect(screen.queryByTestId('confirmModalConfirmButton')).not.toBeInTheDocument();
    });
  });
});
