/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  CASES_TEMPLATE_CREATED_EVENT_TYPE,
  CASES_TEMPLATE_DELETED_EVENT_TYPE,
  CASES_TEMPLATE_UPDATED_EVENT_TYPE,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana';
import { useCasesContext } from '../../components/cases_context/use_cases_context';
import {
  useTemplateCreatedEBT,
  useTemplateDeletedEBT,
  useTemplateUpdatedEBT,
} from './use_template_management_ebt';

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

describe('template management EBT hooks', () => {
  const reportEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(getMockServices(reportEvent));
    (useCasesContext as jest.Mock).mockReturnValue({ owner: [SECURITY_SOLUTION_OWNER] });
  });

  describe('useTemplateCreatedEBT', () => {
    it('reports a blank create from the editor with the owner', () => {
      const { result } = renderHook(() => useTemplateCreatedEBT());

      result.current({ entryPoint: 'template_editor', creationMode: 'blank' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_CREATED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'template_editor',
        creation_mode: 'blank',
      });
    });

    it('reports a clone from the templates list with a distinct creation mode', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: [OBSERVABILITY_OWNER] });
      const { result } = renderHook(() => useTemplateCreatedEBT());

      result.current({ entryPoint: 'templates_list', creationMode: 'clone' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_CREATED_EVENT_TYPE, {
        owner: OBSERVABILITY_OWNER,
        entry_point: 'templates_list',
        creation_mode: 'clone',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useTemplateCreatedEBT());

      result.current({ entryPoint: 'template_editor', creationMode: 'blank' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_CREATED_EVENT_TYPE, {
        owner: 'unknown',
        entry_point: 'template_editor',
        creation_mode: 'blank',
      });
    });
  });

  describe('useTemplateUpdatedEBT', () => {
    it('reports an editor save with the owner', () => {
      const { result } = renderHook(() => useTemplateUpdatedEBT());

      result.current({ entryPoint: 'template_editor' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_UPDATED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'template_editor',
      });
    });

    it('reports an update from the templates list', () => {
      const { result } = renderHook(() => useTemplateUpdatedEBT());

      result.current({ entryPoint: 'templates_list' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_UPDATED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'templates_list',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: [] });
      const { result } = renderHook(() => useTemplateUpdatedEBT());

      result.current({ entryPoint: 'template_editor' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_UPDATED_EVENT_TYPE, {
        owner: 'unknown',
        entry_point: 'template_editor',
      });
    });
  });

  describe('useTemplateDeletedEBT', () => {
    it('reports a single row delete with the owner', () => {
      const { result } = renderHook(() => useTemplateDeletedEBT());

      result.current({ entryPoint: 'templates_list', deleteScope: 'single' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_DELETED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'templates_list',
        delete_scope: 'single',
      });
    });

    it('reports a bulk delete once, with a distinct scope', () => {
      const { result } = renderHook(() => useTemplateDeletedEBT());

      result.current({ entryPoint: 'templates_list', deleteScope: 'bulk' });

      expect(reportEvent).toHaveBeenCalledTimes(1);
      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_DELETED_EVENT_TYPE, {
        owner: SECURITY_SOLUTION_OWNER,
        entry_point: 'templates_list',
        delete_scope: 'bulk',
      });
    });

    it('falls back to unknown owner', () => {
      (useCasesContext as jest.Mock).mockReturnValue({ owner: ['invalid'] });
      const { result } = renderHook(() => useTemplateDeletedEBT());

      result.current({ entryPoint: 'templates_list', deleteScope: 'single' });

      expect(reportEvent).toHaveBeenCalledWith(CASES_TEMPLATE_DELETED_EVENT_TYPE, {
        owner: 'unknown',
        entry_point: 'templates_list',
        delete_scope: 'single',
      });
    });
  });

  it('does not report anything when a hook only renders', () => {
    renderHook(() => useTemplateCreatedEBT());
    renderHook(() => useTemplateUpdatedEBT());
    renderHook(() => useTemplateDeletedEBT());

    expect(reportEvent).not.toHaveBeenCalled();
  });
});
