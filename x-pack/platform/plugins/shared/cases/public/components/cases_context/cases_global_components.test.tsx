/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getAllCasesSelectorModalNoProviderLazy } from '../../client/ui/get_all_cases_selector_modal';
import { getCreateCaseFlyoutLazyNoProvider } from '../../client/ui/get_create_case_flyout';
import { getRemoveAlertFromCaseModal } from '../../client/ui/get_remove_alert_modal';

import { renderWithTestingProviders } from '../../common/mock';
import { getInitialCasesContextState } from './state/cases_context_reducer';
import { CasesGlobalComponents } from './cases_global_components';

jest.mock('../../client/ui/get_create_case_flyout');
jest.mock('../../client/ui/get_all_cases_selector_modal');
jest.mock('../../client/ui/get_remove_alert_modal');

const getCreateCaseFlyoutLazyNoProviderMock = getCreateCaseFlyoutLazyNoProvider as jest.Mock;
const getAllCasesSelectorModalNoProviderLazyMock =
  getAllCasesSelectorModalNoProviderLazy as jest.Mock;
const getRemoveAlertFromCaseModalMock = getRemoveAlertFromCaseModal as jest.Mock;

describe('Cases context UI', () => {
  beforeEach(() => {
    getCreateCaseFlyoutLazyNoProviderMock.mockClear();
  });

  describe('create case flyout', () => {
    it('should render the create case flyout when isFlyoutOpen is true', async () => {
      const state = {
        ...getInitialCasesContextState(),
        createCaseFlyout: {
          isFlyoutOpen: true,
          props: {
            attachments: [],
          },
        },
      };
      renderWithTestingProviders(<CasesGlobalComponents state={state} />);
      expect(getCreateCaseFlyoutLazyNoProviderMock).toHaveBeenCalledWith({ attachments: [] });
    });

    it('should not render the create case flyout when isFlyoutOpen is false', async () => {
      const state = {
        ...getInitialCasesContextState(),
        createCaseFlyout: {
          isFlyoutOpen: false,
        },
      };
      renderWithTestingProviders(<CasesGlobalComponents state={state} />);
      expect(getCreateCaseFlyoutLazyNoProviderMock).not.toHaveBeenCalled();
    });
  });

  describe('select case modal', () => {
    it('should render the select case modal when isModalOpen is true', async () => {
      const onRowClick = jest.fn();
      const state = {
        ...getInitialCasesContextState(),
        selectCaseModal: {
          isModalOpen: true,
          props: {
            attachments: [],
            onRowClick,
          },
        },
      };
      renderWithTestingProviders(<CasesGlobalComponents state={state} />);
      expect(getAllCasesSelectorModalNoProviderLazyMock).toHaveBeenCalledWith({
        attachments: [],
        onRowClick,
      });
    });

    it('should not render the select case modal when isModalOpen is false', async () => {
      const state = {
        ...getInitialCasesContextState(),
        selectCaseModal: {
          isModalOpen: false,
        },
      };
      renderWithTestingProviders(<CasesGlobalComponents state={state} />);
      expect(getAllCasesSelectorModalNoProviderLazyMock).toHaveBeenCalled();
    });
  });

  describe('removeAlertModal', () => {
    it('should render the remove alert modal when isModalOpen is true', async () => {
      const state = {
        ...getInitialCasesContextState(),
        removeAlertModal: {
          isModalOpen: true,
          props: {
            caseId: 'case-id',
            alertId: ['alert-id'],
            onSuccess: jest.fn(),
            onClose: jest.fn(),
          },
        },
      };
      renderWithTestingProviders(<CasesGlobalComponents state={state} />);
      expect(getRemoveAlertFromCaseModalMock).toHaveBeenCalledWith({
        caseId: 'case-id',
        alertId: ['alert-id'],
        onSuccess: expect.any(Function),
        onClose: expect.any(Function),
      });
    });

    it('should not render the select case modal when isModalOpen is false', async () => {
      const state = {
        ...getInitialCasesContextState(),
        selectCaseModal: {
          isModalOpen: false,
        },
      };
      renderWithTestingProviders(<CasesGlobalComponents state={state} />);
      expect(getAllCasesSelectorModalNoProviderLazyMock).toHaveBeenCalled();
    });
  });
});
