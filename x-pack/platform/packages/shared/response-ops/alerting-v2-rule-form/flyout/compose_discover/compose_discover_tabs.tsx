/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiTabs, EuiTab, EuiSpacer, EuiPanel, EuiText } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID } from '@kbn/monaco';
import type { ComposeDiscoverState, ComposeDiscoverAction, QueryTab } from './types';

interface ComposeDiscoverTabsProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
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
}

const TabEditor: React.FC<TabEditorProps> = ({ lockedQuery, editableQuery, onChange }) => {
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
      />
    </>
  );
};

const TABS: Array<{ id: QueryTab; name: string }> = [
  { id: 'base', name: 'Base' },
  { id: 'alert', name: 'Alert' },
  { id: 'recovery', name: 'Recovery' },
];

export const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps> = ({ state, dispatch }) => {
  const recoveryDisabled = state.recoveryMode === 'default';

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
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <EuiTabs>
        {TABS.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={state.activeTab === tab.id}
            onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
            disabled={tab.id === 'recovery' && recoveryDisabled}
            data-test-subj={`composeDiscoverTab-${tab.id}`}
          >
            {tab.name}
          </EuiTab>
        ))}
      </EuiTabs>
      <EuiSpacer size="m" />
      {renderEditor()}
    </>
  );
};
