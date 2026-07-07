/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { ConnectorTypes } from '../../../common/types/domain';
import { basicCase, pushedCase, pushConnectorId } from '../../containers/mock';
import { useApplyTemplateConnectorGuard } from './use_apply_template_connector_guard';

const mockChangeTemplate = jest.fn();
jest.mock('./use_change_applied_template', () => {
  const actual = jest.requireActual('./use_change_applied_template');
  return {
    ...actual,
    useChangeAppliedTemplate: () => ({ mutate: mockChangeTemplate, isLoading: false }),
  };
});

const mockUseGetSupportedActionConnectors = jest.fn();
jest.mock('../../containers/configure/use_get_supported_action_connectors', () => ({
  useGetSupportedActionConnectors: () => mockUseGetSupportedActionConnectors(),
}));

const mockUseGetCaseConnectors = jest.fn();
jest.mock('../../containers/use_get_case_connectors', () => ({
  useGetCaseConnectors: (...args: unknown[]) => mockUseGetCaseConnectors(...args),
}));

const connectors = [
  { id: 'jira-1', actionTypeId: '.jira', name: 'My Jira', config: {} },
  { id: pushConnectorId, actionTypeId: '.servicenow', name: 'My SN connector', config: {} },
];

// The template's default connector (system B = Jira).
const jiraTemplate = {
  id: 'tmpl-1',
  version: 1,
  fields: [],
  connector: {
    type: ConnectorTypes.jira,
    id: 'jira-1',
    fields: { issueType: '10006', priority: null, parent: null },
  },
  settings: { syncAlerts: true },
};

const loadedConnectors = { data: connectors, isLoading: false };
const noPushHistory = { data: {}, isLoading: false };
// The case's current connector (ServiceNow) has already been pushed.
const pushedHistory = {
  data: {
    [pushConnectorId]: {
      name: 'My SN connector',
      type: '.servicenow',
      fields: null,
      push: { needsToBePushed: false, hasBeenPushed: true },
    },
  },
  isLoading: false,
};

describe('useApplyTemplateConnectorGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetSupportedActionConnectors.mockReturnValue(loadedConnectors);
    mockUseGetCaseConnectors.mockReturnValue(noPushHistory);
  });

  it('exposes isInitializing until connectors and push history have loaded', () => {
    mockUseGetSupportedActionConnectors.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: basicCase }));
    expect(result.current.isInitializing).toBe(true);
  });

  it('does not apply while still initializing (guards the connector-drop race)', () => {
    mockUseGetCaseConnectors.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: basicCase }));

    act(() => {
      result.current.applyTemplate(jiraTemplate);
    });

    expect(mockChangeTemplate).not.toHaveBeenCalled();
    expect(result.current.pendingConnectorChange).toBeNull();
  });

  it('applies directly when the case has not been pushed to its current connector', () => {
    // basicCase.connector is `.none`, which cannot have been pushed.
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: basicCase }));

    act(() => {
      result.current.applyTemplate(jiraTemplate, { onSuccess: jest.fn() });
    });

    expect(result.current.pendingConnectorChange).toBeNull();
    expect(mockChangeTemplate).toHaveBeenCalledWith(
      { caseData: basicCase, newTemplate: jiraTemplate },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it('applies directly when the connector is not changing, even if pushed', () => {
    mockUseGetCaseConnectors.mockReturnValue(pushedHistory);
    // Template targets the same ServiceNow connector the case is already on.
    const sameConnectorTemplate = {
      ...jiraTemplate,
      connector: { type: ConnectorTypes.serviceNowITSM, id: pushConnectorId, fields: null },
    };
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: pushedCase }));

    act(() => {
      result.current.applyTemplate(sameConnectorTemplate);
    });

    expect(result.current.pendingConnectorChange).toBeNull();
    expect(mockChangeTemplate).toHaveBeenCalledWith(
      { caseData: pushedCase, newTemplate: sameConnectorTemplate },
      undefined
    );
  });

  it('requires confirmation when changing the connector of an already-pushed case', () => {
    mockUseGetCaseConnectors.mockReturnValue(pushedHistory);
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: pushedCase }));

    act(() => {
      result.current.applyTemplate(jiraTemplate);
    });

    expect(mockChangeTemplate).not.toHaveBeenCalled();
    expect(result.current.pendingConnectorChange).toEqual({
      currentConnectorName: 'My SN connector',
      nextConnectorName: 'My Jira',
    });
  });

  it('surfaces a removal (nextConnectorName null) when the template has no connector', () => {
    mockUseGetCaseConnectors.mockReturnValue(pushedHistory);
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: pushedCase }));

    act(() => {
      result.current.applyTemplate({ id: 'tmpl-2', version: 1, fields: [] });
    });

    expect(result.current.pendingConnectorChange).toEqual({
      currentConnectorName: 'My SN connector',
      nextConnectorName: null,
    });
  });

  it('confirmConnectorChange applies the template without a connector override', () => {
    mockUseGetCaseConnectors.mockReturnValue(pushedHistory);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: pushedCase }));

    act(() => {
      result.current.applyTemplate(jiraTemplate, { onSuccess });
    });
    act(() => {
      result.current.confirmConnectorChange();
    });

    expect(mockChangeTemplate).toHaveBeenCalledWith(
      { caseData: pushedCase, newTemplate: jiraTemplate },
      { onSuccess }
    );
    expect(result.current.pendingConnectorChange).toBeNull();
  });

  it('cancelConnectorChange retains the current connector but still applies the template', () => {
    mockUseGetCaseConnectors.mockReturnValue(pushedHistory);
    const onSuccess = jest.fn();
    const { result } = renderHook(() => useApplyTemplateConnectorGuard({ caseData: pushedCase }));

    act(() => {
      result.current.applyTemplate(jiraTemplate, { onSuccess });
    });
    act(() => {
      result.current.cancelConnectorChange();
    });

    expect(mockChangeTemplate).toHaveBeenCalledWith(
      {
        caseData: pushedCase,
        newTemplate: jiraTemplate,
        connectorOverride: pushedCase.connector,
      },
      { onSuccess }
    );
    expect(result.current.pendingConnectorChange).toBeNull();
  });
});
