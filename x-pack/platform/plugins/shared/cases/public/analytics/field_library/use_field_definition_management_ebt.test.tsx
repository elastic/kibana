/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import {
  CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE,
  CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE,
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { registerFieldLibraryManagementEvents } from './register_management_events';
import {
  useFieldDefinitionCreatedEBT,
  useFieldDefinitionDeletedEBT,
  useFieldDefinitionUpdatedEBT,
} from './use_field_definition_management_ebt';

vi.mock('../../common/lib/kibana', () => {
  const mocked = {
    useKibana: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../components/cases_context/use_cases_context', () => {
  const mocked = {
    useCasesContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

const getMockServices = (reportEvent: Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('field definition management EBT hooks', () => {
  const reportEvent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useKibana as Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('useFieldDefinitionCreatedEBT', () => {
    it('reports a global field created with the owner', () => {
      const { result } = renderHook(() => useFieldDefinitionCreatedEBT());

      result.current({ isGlobal: true });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        is_global: true,
      });
    });

    it('reports a reusable field created with a distinct scope', () => {
      (useCasesContext as Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
      const { result } = renderHook(() => useFieldDefinitionCreatedEBT());

      result.current({ isGlobal: false });

      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, {
        owner: OBSERVABILITY_OWNER,
        is_global: false,
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useFieldDefinitionCreatedEBT());

      result.current({ isGlobal: true });

      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, {
        owner: 'unknown',
        is_global: true,
      });
    });
  });

  describe('useFieldDefinitionUpdatedEBT', () => {
    it('reports a field promoted to global', () => {
      const { result } = renderHook(() => useFieldDefinitionUpdatedEBT());

      result.current({ isGlobal: true });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        is_global: true,
      });
    });

    it('reports a field demoted to reusable', () => {
      const { result } = renderHook(() => useFieldDefinitionUpdatedEBT());

      result.current({ isGlobal: false });

      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        is_global: false,
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as Mock).mockReturnValue({ owner: [] });
      const { result } = renderHook(() => useFieldDefinitionUpdatedEBT());

      result.current({ isGlobal: false });

      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_UPDATED_EVENT_TYPE, {
        owner: 'unknown',
        is_global: false,
      });
    });
  });

  describe('useFieldDefinitionDeletedEBT', () => {
    it('reports a delete with the owner and no scope', () => {
      const { result } = renderHook(() => useFieldDefinitionDeletedEBT());

      result.current();

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
      });
    });

    // Stack management is a real Field Library surface, and 'cases' is the one owner value that
    // reads like the fallback but is a registered solution.
    it('reports the stack management owner as itself, not as the fallback', () => {
      (useCasesContext as Mock).mockReturnValue({ owner: [GENERAL_CASES_OWNER] });
      const { result } = renderHook(() => useFieldDefinitionDeletedEBT());

      result.current();

      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE, {
        owner: GENERAL_CASES_OWNER,
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useFieldDefinitionDeletedEBT());

      result.current();

      expect(reportEvent).toHaveBeenCalledWith(CASES_FIELD_DEFINITION_DELETED_EVENT_TYPE, {
        owner: 'unknown',
      });
    });
  });

  // Step 3 passes these reporters into `useMutation` options, so both the freshness of the captured
  // owner and the identity of the callback are behavior, not style.
  it('reports the new owner after the context owner changes', () => {
    const { result, rerender } = renderHook(() => useFieldDefinitionCreatedEBT());

    result.current({ isGlobal: true });

    (useCasesContext as Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
    rerender();
    result.current({ isGlobal: true });

    expect(reportEvent).toHaveBeenLastCalledWith(CASES_FIELD_DEFINITION_CREATED_EVENT_TYPE, {
      owner: OBSERVABILITY_OWNER,
      is_global: true,
    });
  });

  it('keeps a stable reporter across renders', () => {
    const { result, rerender } = renderHook(() => useFieldDefinitionCreatedEBT());
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it('reports nothing when the hooks only render', () => {
    renderHook(() => useFieldDefinitionCreatedEBT());
    renderHook(() => useFieldDefinitionUpdatedEBT());
    renderHook(() => useFieldDefinitionDeletedEBT());

    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('reports only bounded values, never a field name or free text', () => {
    const { result: created } = renderHook(() => useFieldDefinitionCreatedEBT());
    const { result: updated } = renderHook(() => useFieldDefinitionUpdatedEBT());
    const { result: deleted } = renderHook(() => useFieldDefinitionDeletedEBT());

    created.current({ isGlobal: true });
    updated.current({ isGlobal: false });
    deleted.current();

    const boundedValues: Record<string, Array<string | boolean>> = {
      owner: [...OWNERS, 'unknown'],
      is_global: [true, false],
    };

    expect(reportEvent).toHaveBeenCalledTimes(3);

    reportEvent.mock.calls.forEach(([, payload]) => {
      Object.entries(payload as Record<string, string | boolean>).forEach(([field, value]) => {
        expect(boundedValues[field]).toContain(value);
      });
    });
  });

  // The registered schema and the reported payload live in two files, so a field rename in one of
  // them still compiles. This is the assertion that fails on that drift.
  it('reports exactly the fields the register module declares', () => {
    const analyticsService = coreMock.createSetup().analytics;
    registerFieldLibraryManagementEvents({ analyticsService });

    const registeredFields = (analyticsService.registerEventType as Mock).mock.calls.reduce(
      (acc, [options]) => ({ ...acc, [options.eventType]: Object.keys(options.schema).sort() }),
      {} as Record<string, string[]>
    );

    const { result: created } = renderHook(() => useFieldDefinitionCreatedEBT());
    const { result: updated } = renderHook(() => useFieldDefinitionUpdatedEBT());
    const { result: deleted } = renderHook(() => useFieldDefinitionDeletedEBT());

    created.current({ isGlobal: true });
    updated.current({ isGlobal: false });
    deleted.current();

    // Without this the loop below asserts nothing if the hooks stop reporting entirely.
    expect(reportEvent).toHaveBeenCalledTimes(3);

    reportEvent.mock.calls.forEach(([eventType, payload]) => {
      expect(Object.keys(payload).sort()).toEqual(registeredFields[eventType]);
    });
  });
});
