/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID } from '@kbn/monaco';
import type { ComposeDiscoverState, ComposeDiscoverAction, SandboxTabConfig } from './types';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';

interface ComposeDiscoverTabsProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  /** Controls which tabs are shown. Always `{ type: 'single' }` for now. */
  tabConfig: SandboxTabConfig;
  /** When true, renders only the editor content — tab bar is rendered separately in the header. */
  hideTabBar?: boolean;
  /** Required for future split-query autocomplete (alert/recovery block editors). */
  services: RuleFormServices;
}

/**
 * Renders the single ES|QL editor for the Discover Sandbox.
 * Tab variants (Base/Alert/Recovery) are added in the custom recovery follow-up PR.
 */
export const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps> = ({
  state,
  dispatch,
}) => {
  const editorOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 13,
    }),
    []
  );

  return (
    <CodeEditor
      languageId={ESQL_LANG_ID}
      value={state.fullQuery}
      onChange={(val) => dispatch({ type: 'SET_FULL_QUERY', query: val })}
      height="100%"
      options={editorOptions}
    />
  );
};
