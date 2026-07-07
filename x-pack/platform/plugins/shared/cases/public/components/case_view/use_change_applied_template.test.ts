/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { ConnectorTypes } from '../../../common/types/domain';
import { TestProviders } from '../../common/mock';
import { basicCase } from '../../containers/mock';
import { computeNewExtendedFields, useChangeAppliedTemplate } from './use_change_applied_template';

const mockPatchCase = jest.fn();
jest.mock('../../containers/api', () => ({
  ...jest.requireActual('../../containers/api'),
  patchCase: (...args: unknown[]) => mockPatchCase(...args),
}));

const mockConnectors = [
  {
    id: 'jira-1',
    actionTypeId: '.jira',
    name: 'My Jira',
    config: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
  },
];
jest.mock('../../containers/configure/use_get_supported_action_connectors', () => ({
  useGetSupportedActionConnectors: () => ({ data: mockConnectors, isLoading: false }),
}));

const mockRefresh = jest.fn();
jest.mock('./use_on_refresh_case_view_page', () => ({
  useRefreshCaseViewPage: () => mockRefresh,
}));

const mockShowSuccessToast = jest.fn();
const mockShowErrorToast = jest.fn();
jest.mock('../../common/use_cases_toast', () => ({
  useCasesToast: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
  }),
}));

const caseWithTemplate = {
  ...basicCase,
  template: { id: 'tmpl-1', version: 2 },
  extendedFields: {
    priorityAsKeyword: 'high',
    notesAsKeyword: '',
  },
};

const templateFields = [
  {
    name: 'priority',
    type: 'keyword' as const,
    control: 'INPUT_TEXT' as const,
    metadata: { default: 'low' },
  },
  {
    name: 'notes',
    type: 'keyword' as const,
    control: 'TEXTAREA' as const,
    metadata: { default: 'N/A' },
  },
  {
    name: 'score',
    type: 'long' as const,
    control: 'INPUT_NUMBER' as const,
    metadata: { default: 0 },
  },
];

describe('computeNewExtendedFields', () => {
  it('keeps existing populated values for fields in the new template', () => {
    const result = computeNewExtendedFields(templateFields, { priorityAsKeyword: 'high' });

    expect(result.priority_as_keyword).toBe('high');
  });

  it('uses the template default for fields with an empty string value', () => {
    const result = computeNewExtendedFields(templateFields, { notesAsKeyword: '' });

    expect(result.notes_as_keyword).toBe('N/A');
  });

  it('uses the template default for fields missing from current extended_fields', () => {
    const result = computeNewExtendedFields(templateFields, {});

    expect(result.priority_as_keyword).toBe('low');
    expect(result.notes_as_keyword).toBe('N/A');
    expect(result.score_as_long).toBe('0');
  });

  it('only includes fields from the new template (drops orphaned old fields)', () => {
    const result = computeNewExtendedFields(templateFields, {
      priorityAsKeyword: 'high',
      oldFieldAsKeyword: 'orphaned',
    });

    expect(Object.keys(result)).not.toContain('old_field_as_keyword');
  });

  it('returns an empty object when the new template has no fields', () => {
    const result = computeNewExtendedFields([], { priorityAsKeyword: 'high' });

    expect(result).toEqual({});
  });
});

describe('useChangeAppliedTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPatchCase.mockResolvedValue([caseWithTemplate]);
  });

  it('calls patchCase with the new template and computed extended_fields', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseData: caseWithTemplate,
        newTemplate: {
          id: 'tmpl-2',
          version: 5,
          fields: templateFields,
        },
      });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: caseWithTemplate.id,
          version: caseWithTemplate.version,
          updatedCase: expect.objectContaining({
            template: { id: 'tmpl-2', version: 5 },
            // priority was populated → kept; notes was empty → gets default; score missing → gets default
            extended_fields: {
              priority_as_keyword: 'high',
              notes_as_keyword: 'N/A',
              score_as_long: '0',
            },
          }),
        })
      );
    });
  });

  it('resolves the template connector and applies its settings', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseData: caseWithTemplate,
        newTemplate: {
          id: 'tmpl-2',
          version: 5,
          fields: templateFields,
          connector: {
            type: ConnectorTypes.jira,
            id: 'jira-1',
            fields: { issueType: '10006', priority: null, parent: null },
          },
          settings: { syncAlerts: true },
        },
      });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCase: expect.objectContaining({
            connector: {
              id: 'jira-1',
              name: 'My Jira',
              type: '.jira',
              fields: { issueType: '10006', priority: null, parent: null },
            },
            // declared syncAlerts kept, omitted extractObservables defaults to off
            settings: { syncAlerts: true, extractObservables: false },
          }),
        })
      );
    });
  });

  it('writes connectorOverride verbatim instead of resolving the template connector', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    const retainedConnector = {
      id: 'servicenow-1',
      name: 'My SN connector',
      type: ConnectorTypes.serviceNowITSM,
      fields: null,
    };

    act(() => {
      result.current.mutate({
        caseData: caseWithTemplate,
        newTemplate: {
          id: 'tmpl-2',
          version: 5,
          fields: templateFields,
          // Template would switch to jira, but the override must win (user chose to retain).
          connector: {
            type: ConnectorTypes.jira,
            id: 'jira-1',
            fields: { issueType: '10006', priority: null, parent: null },
          },
          settings: { syncAlerts: true },
        },
        connectorOverride: retainedConnector,
      });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCase: expect.objectContaining({
            connector: retainedConnector,
            // settings still override regardless of the connector decision
            settings: { syncAlerts: true, extractObservables: false },
          }),
        })
      );
    });
  });

  it('falls back to the none connector when the template connector no longer resolves', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseData: caseWithTemplate,
        newTemplate: {
          id: 'tmpl-2',
          version: 5,
          fields: templateFields,
          connector: {
            type: ConnectorTypes.jira,
            id: 'deleted-connector',
            fields: { issueType: '10006', priority: null, parent: null },
          },
        },
      });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCase: expect.objectContaining({
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
          }),
        })
      );
    });
  });

  it('clears the connector to none and turns settings off when the template defines neither', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseData: caseWithTemplate,
        newTemplate: { id: 'tmpl-2', version: 5, fields: templateFields },
      });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCase: expect.objectContaining({
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
            settings: { syncAlerts: false, extractObservables: false },
          }),
        })
      );
    });
  });

  it('calls patchCase with template: null, empty extended_fields, and reset connector/settings when removing a template', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseData: caseWithTemplate, newTemplate: null });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCase: expect.objectContaining({
            template: null,
            extended_fields: {},
            connector: { id: 'none', name: 'none', type: '.none', fields: null },
            settings: { syncAlerts: false, extractObservables: false },
          }),
        })
      );
    });
  });

  it('calls refreshCaseViewPage and shows success toast on success', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseData: caseWithTemplate, newTemplate: null });
    });

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockShowSuccessToast).toHaveBeenCalled();
    });
  });

  it('shows error toast on failure', async () => {
    mockPatchCase.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseData: caseWithTemplate, newTemplate: null });
    });

    await waitFor(() => {
      expect(mockShowErrorToast).toHaveBeenCalled();
    });

    expect(mockRefresh).not.toHaveBeenCalled();
  });
});
