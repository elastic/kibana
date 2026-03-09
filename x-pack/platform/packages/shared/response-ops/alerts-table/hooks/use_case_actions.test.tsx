/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import {
  createCasesServiceMock,
  openAddToExistingCaseModalMock,
  openAddToNewCaseFlyoutMock,
} from '../mocks/cases.mock';
import { useCaseActions } from './use_case_actions';

const casesServiceMock = createCasesServiceMock();

const mockAlert: Alert = {
  _id: 'alert-id-1',
  _index: '.alerts-default-000001',
  'kibana.alert.status': ['active'],
  'kibana.alert.rule.name': ['Test rule'],
};

describe('useCaseActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    casesServiceMock.helpers.getRuleIdFromEvent.mockReturnValue({
      id: 'rule-id',
      name: 'Test rule',
    });
  });

  it('opens the new case flyout with alert attachments', () => {
    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
      })
    );

    act(() => {
      result.current.handleAddToNewCaseClick();
    });

    expect(openAddToNewCaseFlyoutMock).toHaveBeenCalledWith({
      attachments: [
        expect.objectContaining({
          alertId: 'alert-id-1',
          index: '.alerts-default-000001',
          type: 'alert',
          rule: { id: 'rule-id', name: 'Test rule' },
        }),
      ],
    });
  });

  it('opens the existing case modal with alert attachments', () => {
    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
      })
    );

    act(() => {
      result.current.handleAddToExistingCaseClick();
    });

    expect(openAddToExistingCaseModalMock).toHaveBeenCalledWith({
      getAttachments: expect.any(Function),
    });

    const { getAttachments } = openAddToExistingCaseModalMock.mock.calls[0][0];
    expect(getAttachments()).toEqual([
      expect.objectContaining({
        alertId: 'alert-id-1',
        index: '.alerts-default-000001',
        type: 'alert',
        rule: { id: 'rule-id', name: 'Test rule' },
      }),
    ]);
  });

  it('calls onAddToCase with { isNewCase: true } when adding to new case', () => {
    const onAddToCase = jest.fn();

    renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
        onAddToCase,
      })
    );

    const onSuccessCallback =
      casesServiceMock.hooks.useCasesAddToNewCaseFlyout.mock.calls[0]?.[0]?.onSuccess;
    expect(onSuccessCallback).toBeDefined();
    act(() => {
      onSuccessCallback!();
    });

    expect(onAddToCase).toHaveBeenCalledWith({ isNewCase: true });
  });

  it('calls onAddToCase with { isNewCase: false } when adding to existing case', () => {
    const onAddToCase = jest.fn();

    renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
        onAddToCase,
      })
    );

    const onSuccessCallback =
      casesServiceMock.hooks.useCasesAddToExistingCaseModal.mock.calls[0]?.[0]?.onSuccess;
    expect(onSuccessCallback).toBeDefined();
    act(() => {
      onSuccessCallback!();
    });

    expect(onAddToCase).toHaveBeenCalledWith({ isNewCase: false });
  });

  it('returns no-op handlers when cases service is undefined', () => {
    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: undefined,
      })
    );

    act(() => {
      result.current.handleAddToNewCaseClick();
      result.current.handleAddToExistingCaseClick();
    });

    expect(openAddToNewCaseFlyoutMock).not.toHaveBeenCalled();
    expect(openAddToExistingCaseModalMock).not.toHaveBeenCalled();
  });

  it('builds attachments for multiple alerts', () => {
    const secondAlert: Alert = {
      _id: 'alert-id-2',
      _index: '.alerts-default-000002',
      'kibana.alert.status': ['recovered'],
    };

    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert, secondAlert],
        cases: casesServiceMock,
      })
    );

    act(() => {
      result.current.handleAddToNewCaseClick();
    });

    const { attachments } = openAddToNewCaseFlyoutMock.mock.calls[0][0];
    expect(attachments).toHaveLength(2);
    expect(attachments[0].alertId).toBe('alert-id-1');
    expect(attachments[1].alertId).toBe('alert-id-2');
  });
});
