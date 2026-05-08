/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTabs, EuiTab, EuiSpacer, EuiPanel, EuiText } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID, monaco } from '@kbn/monaco';
import type { ComposeDiscoverState, ComposeDiscoverAction, QueryTab, SandboxTabConfig } from './types';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useSplitQueryCompletion } from './use_split_query_completion';

interface ComposeDiscoverTabsProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  /** Controls which tabs are shown. Computed by getSandboxTabConfig() in the parent. */
  tabConfig: SandboxTabConfig;
  /** When true, renders only the editor content — tab bar is rendered separately in the header. */
  hideTabBar?: boolean;
  /** Required for split-query autocomplete (alert/recovery block editors). */
  services: RuleFormServices;
}

const lockedEditorStyles: React.CSSProperties = {
  opacity: 0.6,
  pointerEvents: 'none',
  borderBottom: '1px solid var(--euiColorLightShade)',
};

interface TabEditorProps {
  lockedQuery?: string;
  editableQuery: string;
  onChange: (value: string) => void;
  /** Optional mount callback — used to register per-editor completion providers. */
  onEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
}

const TabEditor: React.FC<TabEditorProps> = ({ lockedQuery, editableQuery, onChange, onEditorMount }) => {
  const lockedLineCount = lockedQuery ? lockedQuery.split('\n').length : 0;
  const lockedHeight = lockedLineCount * 19 + 8;

  const editableOptions = useMemo(
    () => ({
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 13,
      ...(lockedLineCount > 0 && {
        lineNumbers: ((n: number) => String(n + lockedLineCount)) as unknown as 'on',
      }),
    }),
    [lockedLineCount]
  );

  if (!lockedQuery) {
    return (
      <CodeEditor
        languageId={ESQL_LANG_ID}
        value={editableQuery}
        onChange={onChange}
        height={200}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
        }}
      />
    );
  }

  return (
    <>
      <div style={lockedEditorStyles}>
        <CodeEditor
          languageId={ESQL_LANG_ID}
          value={lockedQuery}
          height={lockedHeight}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'none',
            overviewRulerLanes: 0,
            domReadOnly: true,
            fontSize: 13,
          }}
        />
      </div>
      <CodeEditor
        languageId={ESQL_LANG_ID}
        value={editableQuery}
        onChange={onChange}
        height={200}
        options={editableOptions}
        editorDidMount={onEditorMount}
      />
    </>
  );
};

const ALL_TABS: Array<{ id: QueryTab; name: string }> = [
  { id: 'base', name: 'Base query' },
  { id: 'alert', name: 'Alert query' },
  { id: 'recovery', name: 'Recovery query' },
];

/** Maps a SandboxTabConfig to the set of tab IDs to render. */
function getVisibleTabIds(tabConfig: SandboxTabConfig): QueryTab[] {
  switch (tabConfig.type) {
    case 'base-alert':
      return ['base', 'alert'];
    case 'base-recovery':
      // Only show recovery tab — base is shown as locked context above the editor, not a separate tab
      return ['recovery'];
    case 'all-three':
      return ['base', 'alert', 'recovery'];
    case 'single':
    default:
      return [];
  }
}

/** True when the recovery tab should be shown but treated as disabled. */
function isRecoveryTabDisabled(state: ComposeDiscoverState, tabConfig: SandboxTabConfig): boolean {
  if (tabConfig.type !== 'all-three') return false;
  return state.recoveryType !== 'custom';
}

export const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps> = ({
  state,
  dispatch,
  tabConfig,
  hideTabBar = false,
  services,
}) => {
  const visibleTabIds = getVisibleTabIds(tabConfig);
  const recoveryDisabled = isRecoveryTabDisabled(state, tabConfig);
  const visibleTabs = ALL_TABS.filter((t) => visibleTabIds.includes(t.id));

  // Split-query autocomplete: alert and recovery block editors need the base query
  // as context so they can resolve column names from STATS, EVAL, etc.
  const { onEditorMount: onAlertEditorMount } = useSplitQueryCompletion({
    baseQuery: state.baseQuery,
    search: services.data.search.search,
  });
  const { onEditorMount: onRecoveryEditorMount } = useSplitQueryCompletion({
    baseQuery: state.baseQuery,
    search: services.data.search.search,
  });

  const renderEditor = () => {
    switch (state.activeTab) {
      case 'base':
        return (
          <TabEditor
            editableQuery={state.baseQuery}
            onChange={(val) => dispatch({ type: 'SET_BASE_QUERY', query: val })}
          />
        );
      case 'alert':
        return (
          <TabEditor
            lockedQuery={state.baseQuery || undefined}
            editableQuery={state.alertBlock}
            onChange={(val) => dispatch({ type: 'SET_ALERT_BLOCK', block: val })}
            onEditorMount={onAlertEditorMount}
          />
        );
      case 'recovery':
        if (recoveryDisabled) {
          return (
            <EuiPanel color="subdued" paddingSize="l">
              <EuiText size="s" color="subdued" textAlign="center">
                Enable custom recovery in the rule form to edit a recovery condition.
              </EuiText>
            </EuiPanel>
          );
        }
        return (
          <TabEditor
            lockedQuery={state.baseQuery || undefined}
            editableQuery={state.recoveryBlock}
            onChange={(val) => dispatch({ type: 'SET_RECOVERY_BLOCK', block: val })}
            onEditorMount={onRecoveryEditorMount}
          />
        );
      default:
        return null;
    }
  };

  // Ensure activeTab is valid for the current visible set; default to first visible tab
  const activeTab = visibleTabIds.includes(state.activeTab)
    ? state.activeTab
    : visibleTabIds[0] ?? 'alert';

  // Sync activeTab into state if it drifted (e.g. tabConfig changed)
  React.useEffect(() => {
    if (activeTab !== state.activeTab) {
      dispatch({ type: 'SET_TAB', tab: activeTab });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  return (
    <>
      {!hideTabBar && (
        <EuiTabs>
          {visibleTabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={activeTab === tab.id}
              onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
              disabled={tab.id === 'recovery' && recoveryDisabled}
              data-test-subj={`composeDiscoverTab-${tab.id}`}
            >
              {tab.name}
            </EuiTab>
          ))}
        </EuiTabs>
      )}
      {!hideTabBar && <EuiSpacer size="m" />}
      {renderEditor()}
    </>
  );
};
