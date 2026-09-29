/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useSplitQueryCompletion } from './use_split_query_completion';
import { useSplitQueryValidation } from './use_split_query_validation';
import { useSandboxEditorMounts } from './use_sandbox_editor_mounts';

vi.mock('./use_split_query_completion', () => {
  const mocked = { useSplitQueryCompletion: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock('./use_split_query_validation', () => {
  const mocked = { useSplitQueryValidation: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock('../../form/hooks/use_esql_callbacks', () => {
  const mocked = {
    useEsqlCallbacks: vi.fn(() => ({})),
  };
  return { ...mocked, default: mocked };
});

const editor = {} as monaco.editor.IStandaloneCodeEditor;
const services = {
  application: {},
  http: {},
  data: { search: { search: vi.fn() } },
} as unknown as RuleFormServices;

describe('useSandboxEditorMounts', () => {
  // One spy per underlying hook call, in the order the hook invokes them:
  // completion → [alert, recovery]; validation → [alert, recovery, base, single].
  const completionMounts = [vi.fn(), vi.fn()];
  const validationMounts = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];

  beforeEach(() => {
    vi.clearAllMocks();
    let c = 0;
    let v = 0;
    vi.mocked(useSplitQueryCompletion).mockImplementation(() => ({
      onEditorMount: completionMounts[c++],
    }));
    vi.mocked(useSplitQueryValidation).mockImplementation(() => ({
      onEditorMount: validationMounts[v++],
    }));
  });

  it('composes completion + validation for alert and recovery editors', () => {
    const { result } = renderHook(() =>
      useSandboxEditorMounts({ baseQuery: 'FROM logs-*', services })
    );

    result.current.onAlertEditorMount(editor);
    expect(completionMounts[0]).toHaveBeenCalledWith(editor);
    expect(validationMounts[0]).toHaveBeenCalledWith(editor);

    result.current.onRecoveryEditorMount(editor);
    expect(completionMounts[1]).toHaveBeenCalledWith(editor);
    expect(validationMounts[1]).toHaveBeenCalledWith(editor);
  });

  it('validates the base and single editors verbatim (empty base query)', () => {
    renderHook(() => useSandboxEditorMounts({ baseQuery: 'FROM logs-*', services }));

    // Alert + recovery validate against the base; base + single validate with ''.
    const baseQueries = vi
      .mocked(useSplitQueryValidation)
      .mock.calls.map(([params]) => params.baseQuery);
    expect(baseQueries).toEqual(['FROM logs-*', 'FROM logs-*', '', '']);
  });
});
