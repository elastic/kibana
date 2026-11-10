/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { createCasesServiceMock, openAddToExistingCaseModalMock } from '../mocks/cases.mock';
import { useCaseActions } from './use_case_actions';

const casesServiceMock = createCasesServiceMock();

const mockAlert: Alert = {
  _id: 'alert-id-1',
  _index: '.alerts-default-000001',
  'kibana.alert.status': ['active'],
  'kibana.alert.rule.name': ['Test rule'],
};

const mockAttachments = [
  {
    type: 'stack.alert',
    attachmentId: ['alert-id-1'],
    metadata: { index: ['.alerts-default-000001'], rule: { id: 'rule-id', name: 'Test rule' } },
  },
];

describe('useCaseActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    casesServiceMock.helpers.groupAlertsByRule.mockReturnValue(mockAttachments);
  });

  it('opens the case modal with attachments for the selected case owner', () => {
    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
        owner: ['cases'],
      })
    );

    act(() => {
      result.current.handleAddToCaseClick();
    });

    expect(openAddToExistingCaseModalMock).toHaveBeenCalledWith({
      getAttachments: expect.any(Function),
    });

    const { getAttachments } = openAddToExistingCaseModalMock.mock.calls[0][0];
    expect(getAttachments({ theCase: { id: 'case-id', owner: 'observability' } })).toEqual(
      mockAttachments
    );
    expect(casesServiceMock.helpers.groupAlertsByRule).toHaveBeenCalledWith(
      [
        {
          ecs: { _id: 'alert-id-1', _index: '.alerts-default-000001' },
          data: expect.arrayContaining([{ field: 'kibana.alert.rule.name', value: ['Test rule'] }]),
        },
      ],
      'observability'
    );
  });

  it('falls back to the first configured owner when no case is selected', () => {
    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
        owner: ['securitySolution'],
      })
    );

    act(() => {
      result.current.handleAddToCaseClick();
    });

    const { getAttachments } = openAddToExistingCaseModalMock.mock.calls[0][0];
    getAttachments({});
    expect(casesServiceMock.helpers.groupAlertsByRule).toHaveBeenCalledWith(
      expect.any(Array),
      'securitySolution'
    );
  });

  it.each([true, false])('reports the modal case path: isNewCase=%s', (isNewCase) => {
    const onAddToCase = jest.fn();

    renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: casesServiceMock,
        owner: ['cases'],
        onAddToCase,
      })
    );

    const onSuccessCallback =
      casesServiceMock.hooks.useCasesAddToExistingCaseModal.mock.calls[0]?.[0]?.onSuccess;
    expect(onSuccessCallback).toBeDefined();
    act(() => {
      onSuccessCallback?.({ id: 'case-id', owner: 'cases' }, isNewCase);
    });

    expect(onAddToCase).toHaveBeenCalledWith({ isNewCase });
  });

  it('returns no-op handlers when cases service is undefined', () => {
    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert],
        cases: undefined,
        owner: ['cases'],
      })
    );

    act(() => {
      result.current.handleAddToCaseClick();
    });

    expect(openAddToExistingCaseModalMock).not.toHaveBeenCalled();
  });

  it('groups multiple alerts in a single call', () => {
    const secondAlert: Alert = {
      _id: 'alert-id-2',
      _index: '.alerts-default-000002',
      'kibana.alert.status': ['recovered'],
    };

    const { result } = renderHook(() =>
      useCaseActions({
        alerts: [mockAlert, secondAlert],
        cases: casesServiceMock,
        owner: ['cases'],
      })
    );

    act(() => {
      result.current.handleAddToCaseClick();
    });

    const { getAttachments } = openAddToExistingCaseModalMock.mock.calls[0][0];
    getAttachments({ theCase: { id: 'case-id', owner: 'cases' } });

    expect(casesServiceMock.helpers.groupAlertsByRule).toHaveBeenCalledTimes(1);
    expect(casesServiceMock.helpers.groupAlertsByRule).toHaveBeenCalledWith(
      [
        expect.objectContaining({ ecs: { _id: 'alert-id-1', _index: '.alerts-default-000001' } }),
        expect.objectContaining({ ecs: { _id: 'alert-id-2', _index: '.alerts-default-000002' } }),
      ],
      'cases'
    );
  });
});
