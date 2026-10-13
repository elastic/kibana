/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { monaco } from '@kbn/code-editor';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useSplitQueryCompletion } from './use_split_query_completion';
import { useSplitQueryValidation } from './use_split_query_validation';
import { useSandboxEditorMounts } from './use_sandbox_editor_mounts';

jest.mock('./use_split_query_completion', () => ({ useSplitQueryCompletion: jest.fn() }));
jest.mock('./use_split_query_validation', () => ({ useSplitQueryValidation: jest.fn() }));
jest.mock('../../form/hooks/use_esql_callbacks', () => ({
  useEsqlCallbacks: jest.fn(() => ({})),
}));

const editor = {} as monaco.editor.IStandaloneCodeEditor;
const services = {
  application: {},
  http: {},
  data: { search: { search: jest.fn() } },
} as unknown as RuleFormServices;

describe('useSandboxEditorMounts', () => {
  // One spy per underlying hook call, in the order the hook invokes them:
  // completion → [alert, recovery]; validation → [alert, recovery, base, single].
  const completionMounts = [jest.fn(), jest.fn()];
  const validationMounts = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];

  beforeEach(() => {
    jest.clearAllMocks();
    let c = 0;
    let v = 0;
    jest
      .mocked(useSplitQueryCompletion)
      .mockImplementation(() => ({ onEditorMount: completionMounts[c++] }));
    jest
      .mocked(useSplitQueryValidation)
      .mockImplementation(() => ({ onEditorMount: validationMounts[v++] }));
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
    const baseQueries = jest
      .mocked(useSplitQueryValidation)
      .mock.calls.map(([params]) => params.baseQuery);
    expect(baseQueries).toEqual(['FROM logs-*', 'FROM logs-*', '', '']);
  });
});
