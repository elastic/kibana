/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import {
  CASES_TEMPLATE_APPLIED_EVENT_TYPE,
  CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE,
  CASES_TEMPLATE_CLEARED_EVENT_TYPE,
  OBSERVABILITY_OWNER,
  OWNERS,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import { registerTemplateApplyEvents } from './register_apply_events';
import {
  useTemplateAppliedEBT,
  useTemplateAppliedOnCreateEBT,
  useTemplateClearedEBT,
} from './use_template_apply_ebt';

jest.mock('../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));

jest.mock('../../components/cases_context/use_cases_context', () => ({
  useCasesContext: jest.fn(),
}));

const getMockServices = (reportEvent: jest.Mock) => ({
  services: {
    analytics: {
      reportEvent,
    },
  },
});

describe('template apply EBT hooks', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('useTemplateAppliedOnCreateEBT', () => {
    it('reports a template chosen on the create form with the owner', () => {
      const { result } = renderHook(() => useTemplateAppliedOnCreateEBT());

      result.current({ entryPoint: 'create_form' });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'create_form',
      });
    });

    it('reports the owner of the solution that created the case', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
      const { result } = renderHook(() => useTemplateAppliedOnCreateEBT());

      result.current({ entryPoint: 'create_form' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE, {
        owner: OBSERVABILITY_OWNER,
        entry_point: 'create_form',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useTemplateAppliedOnCreateEBT());

      result.current({ entryPoint: 'create_form' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_APPLIED_ON_CREATE_EVENT_TYPE, {
        owner: 'unknown',
        entry_point: 'create_form',
      });
    });
  });

  describe('useTemplateAppliedEBT', () => {
    it('reports a first apply from the sidebar', () => {
      const { result } = renderHook(() => useTemplateAppliedEBT());

      result.current({ entryPoint: 'case_view_sidebar', applyMode: 'initial' });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_APPLIED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'case_view_sidebar',
        apply_mode: 'initial',
      });
    });

    it('reports a replacement with a distinct apply mode', () => {
      const { result } = renderHook(() => useTemplateAppliedEBT());

      result.current({ entryPoint: 'case_view_sidebar', applyMode: 'replacement' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_APPLIED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'case_view_sidebar',
        apply_mode: 'replacement',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: [] });
      const { result } = renderHook(() => useTemplateAppliedEBT());

      result.current({ entryPoint: 'case_view_sidebar', applyMode: 'initial' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_APPLIED_EVENT_TYPE, {
        owner: 'unknown',
        entry_point: 'case_view_sidebar',
        apply_mode: 'initial',
      });
    });
  });

  describe('useTemplateClearedEBT', () => {
    it('reports a removal from the sidebar with the owner', () => {
      const { result } = renderHook(() => useTemplateClearedEBT());

      result.current({ entryPoint: 'case_view_sidebar' });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_CLEARED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'case_view_sidebar',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useTemplateClearedEBT());

      result.current({ entryPoint: 'case_view_sidebar' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_CLEARED_EVENT_TYPE, {
        owner: 'unknown',
        entry_point: 'case_view_sidebar',
      });
    });
  });

  it('reports nothing when the hooks only render', () => {
    renderHook(() => useTemplateAppliedOnCreateEBT());
    renderHook(() => useTemplateAppliedEBT());
    renderHook(() => useTemplateClearedEBT());

    expect(reportEvent).not.toHaveBeenCalled();
  });

  it('reports only bounded values, never a template name or free text', () => {
    const { result: applied } = renderHook(() => useTemplateAppliedEBT());
    const { result: cleared } = renderHook(() => useTemplateClearedEBT());
    const { result: onCreate } = renderHook(() => useTemplateAppliedOnCreateEBT());

    applied.current({ entryPoint: 'case_view_sidebar', applyMode: 'replacement' });
    cleared.current({ entryPoint: 'case_view_sidebar' });
    onCreate.current({ entryPoint: 'create_form' });

    const boundedValues: Record<string, string[]> = {
      owner: [...OWNERS, 'unknown'],
      entry_point: ['create_form', 'case_view_sidebar'],
      apply_mode: ['initial', 'replacement'],
    };

    expect(reportEvent).toHaveBeenCalledTimes(3);

    reportEvent.mock.calls.forEach(([, payload]) => {
      Object.entries(payload as Record<string, string>).forEach(([field, value]) => {
        expect(boundedValues[field]).toContain(value);
      });
    });
  });

  // The registered schema and the reported payload live in two files, so a field rename in one of
  // them still compiles. This is the assertion that fails on that drift.
  it('reports exactly the fields the register module declares', () => {
    const analyticsService = coreMock.createSetup().analytics;
    registerTemplateApplyEvents({ analyticsService });

    const registeredFields = (analyticsService.registerEventType as jest.Mock).mock.calls.reduce(
      (acc, [options]) => ({ ...acc, [options.eventType]: Object.keys(options.schema).sort() }),
      {} as Record<string, string[]>
    );

    const { result: applied } = renderHook(() => useTemplateAppliedEBT());
    const { result: cleared } = renderHook(() => useTemplateClearedEBT());
    const { result: onCreate } = renderHook(() => useTemplateAppliedOnCreateEBT());

    applied.current({ entryPoint: 'case_view_sidebar', applyMode: 'initial' });
    cleared.current({ entryPoint: 'case_view_sidebar' });
    onCreate.current({ entryPoint: 'create_form' });

    reportEvent.mock.calls.forEach(([eventType, payload]) => {
      expect(Object.keys(payload).sort()).toEqual(registeredFields[eventType]);
    });
  });
});
