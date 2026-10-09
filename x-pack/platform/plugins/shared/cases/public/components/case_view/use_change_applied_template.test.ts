/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { TestProviders } from '../../common/mock';
import { basicCase } from '../../containers/mock';
import type { Field } from '../../../common/types/domain/template/fields';
import { computeNewExtendedFields, useChangeAppliedTemplate } from './use_change_applied_template';

const mockPatchCase = jest.fn();
jest.mock('../../containers/api', () => ({
  ...jest.requireActual('../../containers/api'),
  patchCase: (...args: unknown[]) => mockPatchCase(...args),
}));

const mockShowSuccessToast = jest.fn();
const mockShowErrorToast = jest.fn();
const mockShowInfoToast = jest.fn();
jest.mock('../../common/use_cases_toast', () => ({
  useCasesToast: () => ({
    showSuccessToast: mockShowSuccessToast,
    showErrorToast: mockShowErrorToast,
    showInfoToast: mockShowInfoToast,
  }),
}));

// The hook exposes a "Reload page" action on success; jsdom doesn't implement reload, so stub it.
const originalLocation = window.location;
const mockReload = jest.fn();
beforeAll(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...originalLocation, reload: mockReload },
  });
});
afterAll(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
});

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

  it('omits fields that resolve to an empty value instead of writing "" (required-field regression)', () => {
    // A required field with no default and no existing value must NOT be sent as '' — that trips
    // the server's partial-update "Field X is required" validation on template apply/change.
    const fields: Field[] = [
      { name: 'required_no_default', type: 'keyword', control: 'INPUT_TEXT' },
      { name: 'empty_default', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: '' } },
    ];

    const result = computeNewExtendedFields(fields, {});

    expect(result).not.toHaveProperty('required_no_default_as_keyword');
    expect(result).not.toHaveProperty('empty_default_as_keyword');
  });

  it('omits empty-array defaults ("[]") which also count as empty for required validation', () => {
    const fields: Field[] = [
      {
        name: 'labels',
        type: 'keyword',
        control: 'CHECKBOX_GROUP',
        metadata: { default: [], options: [] },
      },
    ];

    const result = computeNewExtendedFields(fields, {});

    expect(result).not.toHaveProperty('labels_as_keyword');
  });

  it('skips $ref fields (no inline definition to derive a value from)', () => {
    const fields: Field[] = [{ $ref: 'library_field' }];

    const result = computeNewExtendedFields(fields, {});

    expect(result).toEqual({});
  });

  it('skips display-only (MARKDOWN) fields (they hold no value)', () => {
    const fields: Field[] = [
      {
        name: 'instructions',
        type: 'keyword',
        control: 'MARKDOWN',
        metadata: { content: 'Follow these steps.' },
      },
      { name: 'priority', type: 'keyword', control: 'INPUT_TEXT', metadata: { default: 'low' } },
    ];

    const result = computeNewExtendedFields(fields, {});

    expect(result).not.toHaveProperty('instructions_as_keyword');
    expect(result.priority_as_keyword).toBe('low');
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

    // Applying a template must never reassign an existing case's connector.
    expect(mockPatchCase.mock.calls[0][0].updatedCase).not.toHaveProperty('connector');
  });

  it('applies the template settings without touching the connector', async () => {
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
          settings: { syncAlerts: true },
        },
      });
    });

    await waitFor(() => {
      expect(mockPatchCase).toHaveBeenCalledWith(
        expect.objectContaining({
          updatedCase: expect.objectContaining({
            // declared syncAlerts kept, omitted extractObservables defaults to off
            settings: { syncAlerts: true, extractObservables: false },
          }),
        })
      );
    });

    expect(mockPatchCase.mock.calls[0][0].updatedCase).not.toHaveProperty('connector');
  });

  it('turns settings off when the template declares none', async () => {
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
            settings: { syncAlerts: false, extractObservables: false },
          }),
        })
      );
    });

    expect(mockPatchCase.mock.calls[0][0].updatedCase).not.toHaveProperty('connector');
  });

  it('calls patchCase with template: null, empty extended_fields, and reset settings when removing a template', async () => {
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
            settings: { syncAlerts: false, extractObservables: false },
          }),
        })
      );
    });

    expect(mockPatchCase.mock.calls[0][0].updatedCase).not.toHaveProperty('connector');
  });

  it('shows a reload notification on success instead of reloading automatically', async () => {
    const { result } = renderHook(() => useChangeAppliedTemplate(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({ caseData: caseWithTemplate, newTemplate: null });
    });

    await waitFor(() => {
      expect(mockShowInfoToast).toHaveBeenCalled();
    });

    // The page must not reload on its own; the user triggers it via the toast action.
    expect(mockReload).not.toHaveBeenCalled();

    // The toast exposes a persistent "Reload page" action that reloads when clicked.
    const [, , actionProps, options] = mockShowInfoToast.mock.calls[0];
    expect(options).toEqual({ toastLifeTimeMs: Infinity });
    act(() => {
      actionProps.primary.onClick();
    });
    expect(mockReload).toHaveBeenCalled();
  });

  it('shows error toast on failure and does not reload or notify success', async () => {
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

    expect(mockShowInfoToast).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });
});
