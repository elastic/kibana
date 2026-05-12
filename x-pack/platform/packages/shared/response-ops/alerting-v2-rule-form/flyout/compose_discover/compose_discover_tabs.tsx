/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiTab, EuiTabs, EuiSpacer, EuiPanel, EuiText } from '@elastic/eui';
import { CodeEditor, ESQL_LANG_ID } from '@kbn/code-editor';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  QueryTab,
  SandboxTabConfig,
} from './types';
import { useSplitQueryCompletion } from './use_split_query_completion';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';

interface ComposeDiscoverTabsProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  tabConfig: SandboxTabConfig;
  /**
   * When true, only the editor content is rendered — the tab bar is omitted.
   * Used when the parent renders tabs in the flyout header instead.
   */
  hideTabBar?: boolean;
}

const LOCKED_EDITOR_STYLES: React.CSSProperties = {
  opacity: 0.55,
  pointerEvents: 'none',
  borderBottom: '1px solid var(--euiColorLightShade)',
};

interface LockedBaseEditorProps {
  query: string;
}

const LockedBaseEditor: React.FC<LockedBaseEditorProps> = ({ query }) => {
  const lineCount = query.split('\n').length;
  // 19px per line plus a small buffer so the last line isn't clipped
  const height = lineCount * 19 + 8;

  return (
    <div style={LOCKED_EDITOR_STYLES}>
      <CodeEditor
        languageId={ESQL_LANG_ID}
        value={query}
        height={height}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          fontSize: 13,
        }}
      />
    </div>
  );
};

interface BlockEditorProps {
  value: string;
  onChange: (val: string) => void;
  /** Line number offset — makes the block editor's line numbers continue from the base. */
  lineNumberOffset: number;
  onEditorMount?: (editor: import('@kbn/code-editor').monaco.editor.IStandaloneCodeEditor) => void;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  value,
  onChange,
  lineNumberOffset,
  onEditorMount,
}) => {
  const options = useMemo(
    () => ({
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 13,
      ...(lineNumberOffset > 0 && {
        lineNumbers: ((n: number) => String(n + lineNumberOffset)) as unknown as 'on',
      }),
    }),
    [lineNumberOffset]
  );

  return (
    <CodeEditor
      languageId={ESQL_LANG_ID}
      value={value}
      onChange={onChange}
      height={200}
      options={options}
      editorDidMount={onEditorMount}
    />
  );
};

const TAB_DEFINITIONS: Array<{ id: QueryTab; label: string }> = [
  { id: 'base', label: 'Base query' },
  { id: 'alert', label: 'Alert query' },
  { id: 'recovery', label: 'Recovery query' },
];

function visibleTabIds(tabConfig: SandboxTabConfig): QueryTab[] {
  switch (tabConfig.type) {
    case 'base-alert':
      return ['base', 'alert'];
    case 'base-recovery':
      return ['recovery'];
    case 'single':
    default:
      return [];
  }
}

export const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps> = ({
  state,
  dispatch,
  tabConfig,
  hideTabBar = false,
}) => {
  const { data } = useRuleFormServices();
  const tabIds = visibleTabIds(tabConfig);
  const visibleTabs = TAB_DEFINITIONS.filter((t) => tabIds.includes(t.id));

  // Default active tab to the first visible one if it has drifted outside the visible set.
  const safeActiveTab: QueryTab =
    tabIds.length > 0 && tabIds.includes(state.activeTab) ? state.activeTab : tabIds[0] ?? 'alert';

  useEffect(() => {
    if (safeActiveTab !== state.activeTab) {
      dispatch({ type: 'SET_TAB', tab: safeActiveTab });
    }
    // Only correct drift — don't re-run when activeTab changes via user clicks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeActiveTab]);

  // Split-query autocomplete: alert and recovery block editors prepend baseQuery so
  // that ES|QL can resolve column names produced by STATS, EVAL, etc.
  const { onEditorMount: onAlertEditorMount } = useSplitQueryCompletion({
    baseQuery: state.baseQuery,
    search: data.search.search,
  });
  const { onEditorMount: onRecoveryEditorMount } = useSplitQueryCompletion({
    baseQuery: state.baseQuery,
    search: data.search.search,
  });

  const baseLineCount = state.baseQuery.split('\n').length;

  const renderEditor = () => {
    switch (safeActiveTab) {
      case 'base':
        return (
          <BlockEditor
            value={state.baseQuery}
            onChange={(val) => dispatch({ type: 'SET_BASE_QUERY', query: val })}
            lineNumberOffset={0}
          />
        );
      case 'alert':
        return (
          <>
            {state.baseQuery && <LockedBaseEditor query={state.baseQuery} />}
            <BlockEditor
              value={state.alertBlock}
              onChange={(val) => dispatch({ type: 'SET_ALERT_BLOCK', block: val })}
              lineNumberOffset={baseLineCount}
              onEditorMount={onAlertEditorMount}
            />
          </>
        );
      case 'recovery':
        return (
          <>
            {state.baseQuery && <LockedBaseEditor query={state.baseQuery} />}
            <BlockEditor
              value={state.recoveryBlock}
              onChange={(val) => dispatch({ type: 'SET_RECOVERY_BLOCK', block: val })}
              lineNumberOffset={baseLineCount}
              onEditorMount={onRecoveryEditorMount}
            />
          </>
        );
      default:
        return (
          <EuiPanel color="subdued" paddingSize="l">
            <EuiText size="s" color="subdued" textAlign="center">
              No editor available for this tab.
            </EuiText>
          </EuiPanel>
        );
    }
  };

  return (
    <>
      {!hideTabBar && visibleTabs.length > 0 && (
        <>
          <EuiTabs>
            {visibleTabs.map((tab) => (
              <EuiTab
                key={tab.id}
                isSelected={safeActiveTab === tab.id}
                onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
                data-test-subj={`composeDiscoverTab-${tab.id}`}
              >
                {tab.label}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="m" />
        </>
      )}
      {renderEditor()}
    </>
  );
};
