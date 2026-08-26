/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { act, renderHook, screen, waitFor } from '@testing-library/react';

import type { CoreStart } from '@kbn/core/public';
import { DEFAULT_DETECTIONS_CLOSE_REASONS_KEY } from '@kbn/response-ops-detections-close-reason';

import { TestProviders, renderWithTestingProviders } from '../../common/mock';
import { createStartServicesMock } from '../../common/lib/kibana/kibana_react.mock';
import { useCloseCaseModal } from './use_close_case_modal';
import * as i18n from './translations';

describe('useCloseCaseModal', () => {
  const onCloseCase = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when canSyncCloseReasonToAlerts is false', () => {
    it('calls onCloseCase immediately without showing the modal', () => {
      const { result } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: false, onCloseCase }),
        { wrapper: TestProviders }
      );

      act(() => {
        result.current.openCloseCaseModal();
      });

      expect(onCloseCase).toHaveBeenCalledTimes(1);
      expect(onCloseCase).toHaveBeenCalledWith();
      expect(result.current.closeCaseModal).toBeNull();
    });
  });

  describe('when canSyncCloseReasonToAlerts is true', () => {
    it('shows the modal when openCloseCaseModal is called', () => {
      const { result } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        { wrapper: TestProviders }
      );

      expect(result.current.closeCaseModal).toBeNull();

      act(() => {
        result.current.openCloseCaseModal();
      });

      expect(result.current.closeCaseModal).not.toBeNull();
    });

    it('renders the modal with closing reason options', async () => {
      const { result } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        { wrapper: TestProviders }
      );

      act(() => {
        result.current.openCloseCaseModal();
      });

      renderWithTestingProviders(<>{result.current.closeCaseModal}</>);

      expect(
        await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE })
      ).toBeInTheDocument();
      expect(screen.getByText('Close without reason')).toBeInTheDocument();
    });

    it('hides the modal when onClose is called', async () => {
      const { result, rerender } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        { wrapper: TestProviders }
      );

      act(() => {
        result.current.openCloseCaseModal();
      });

      const { rerender: rerenderComponent } = renderWithTestingProviders(
        <>{result.current.closeCaseModal}</>
      );

      expect(
        await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE })
      ).toBeInTheDocument();

      await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON));

      rerender();
      rerenderComponent(<>{result.current.closeCaseModal}</>);

      expect(
        screen.queryByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE })
      ).not.toBeInTheDocument();
    });

    it('calls onCloseCase with undefined key when "Close without reason" is submitted', async () => {
      const { result, rerender } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        { wrapper: TestProviders }
      );

      act(() => {
        result.current.openCloseCaseModal();
      });

      renderWithTestingProviders(<>{result.current.closeCaseModal}</>);

      await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE });

      // "Close without reason" is selected by default (checked: 'on', key: undefined)
      await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CONFIRM));

      await waitFor(() => {
        expect(onCloseCase).toHaveBeenCalledWith(undefined);
      });

      rerender();
      expect(result.current.closeCaseModal).toBeNull();
    });

    it('calls onCloseCase with the selected reason key when submitted', async () => {
      const { result, rerender } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        { wrapper: TestProviders }
      );

      act(() => {
        result.current.openCloseCaseModal();
      });

      const { rerender: rerenderComponent } = renderWithTestingProviders(
        <>{result.current.closeCaseModal}</>
      );

      await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE });

      await userEvent.click(screen.getByText('Duplicate'));

      rerender();
      rerenderComponent(<>{result.current.closeCaseModal}</>);

      await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CONFIRM));

      await waitFor(() => {
        expect(onCloseCase).toHaveBeenCalledWith('duplicate');
      });
    });

    it('resets close reason options each time the modal is opened', async () => {
      const { result, rerender } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        { wrapper: TestProviders }
      );

      // Open, select a different reason, close without submitting
      act(() => {
        result.current.openCloseCaseModal();
      });

      const { rerender: rerenderComponent } = renderWithTestingProviders(
        <>{result.current.closeCaseModal}</>
      );

      await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE });
      await userEvent.click(screen.getByText('Duplicate'));
      await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CLOSE_BUTTON));

      rerender();
      rerenderComponent(<>{result.current.closeCaseModal}</>);

      // Reopen — options should be reset to default (Close without reason selected)
      act(() => {
        result.current.openCloseCaseModal();
      });

      rerender();
      rerenderComponent(<>{result.current.closeCaseModal}</>);

      await userEvent.click(screen.getByText(i18n.CLOSE_CASE_MODAL_CONFIRM));

      await waitFor(() => {
        expect(onCloseCase).toHaveBeenCalledWith(undefined);
      });
    });

    it('includes custom closing reasons from uiSettings', async () => {
      const coreStartMock = createStartServicesMock();
      (coreStartMock.uiSettings.get as jest.Mock).mockImplementation(
        (key: string, defaultValue: unknown) => {
          if (key === DEFAULT_DETECTIONS_CLOSE_REASONS_KEY) {
            return ['Custom reason 1', 'Custom reason 2'];
          }
          return defaultValue;
        }
      );

      const { result } = renderHook(
        () => useCloseCaseModal({ canSyncCloseReasonToAlerts: true, onCloseCase }),
        {
          wrapper: (props) => (
            <TestProviders {...props} coreStart={coreStartMock as unknown as CoreStart} />
          ),
        }
      );

      act(() => {
        result.current.openCloseCaseModal();
      });

      renderWithTestingProviders(<>{result.current.closeCaseModal}</>);

      await screen.findByRole('dialog', { name: i18n.CLOSE_CASE_MODAL_TITLE });

      expect(screen.getByText('Custom reason 1')).toBeInTheDocument();
      expect(screen.getByText('Custom reason 2')).toBeInTheDocument();
    });
  });
});
