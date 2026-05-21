/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { EuiTab, EuiTabs, EuiSpacer, EuiPanel, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor, ESQL_LANG_ID, type monaco } from '@kbn/code-editor';
import type { QueryTab } from './types';

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;
type LineNumbersType = monaco.editor.LineNumbersType;

interface ComposeDiscoverTabsProps {
  baseQuery: string;
  alertBlock: string;
  recoveryBlock: string;
  onBaseQueryChange: (val: string) => void;
  onAlertBlockChange: (val: string) => void;
  onRecoveryBlockChange: (val: string) => void;
  activeTab: QueryTab;
  onTabChange: (tab: QueryTab) => void;
  tabs: QueryTab[];
  onAlertEditorMount?: (editor: IStandaloneCodeEditor) => void;
  onRecoveryEditorMount?: (editor: IStandaloneCodeEditor) => void;
  /**
   * When true, only the editor content is rendered — the tab bar is omitted.
   * Used when the parent renders tabs in the flyout header instead.
   */
  hideTabBar?: boolean;
  /** When true, all editable query blocks are read-only. Used by Rule Builder preview mode. */
  readOnly?: boolean;
}

const LOCKED_EDITOR_STYLES: React.CSSProperties = {
  opacity: 0.55,
  pointerEvents: 'none',
};

interface LockedBaseEditorProps {
  query: string;
}

const LOCKED_FONT_SIZE = 13;
const LOCKED_LINE_HEIGHT = 18;

const LockedBaseEditor: React.FC<LockedBaseEditorProps> = ({ query }) => {
  const lineCount = query.split('\n').length;
  const height = lineCount * LOCKED_LINE_HEIGHT + 4;

  return (
    <div style={{ ...LOCKED_EDITOR_STYLES, height }}>
      <CodeEditor
        languageId={ESQL_LANG_ID}
        value={query}
        height={height}
        options={{
          readOnly: true,
          domReadOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          fontSize: LOCKED_FONT_SIZE,
          lineHeight: LOCKED_LINE_HEIGHT,
          automaticLayout: true,
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
  onEditorMount?: (editor: IStandaloneCodeEditor) => void;
  readOnly?: boolean;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  value,
  onChange,
  lineNumberOffset,
  onEditorMount,
  readOnly = false,
}) => {
  const options = useMemo(() => {
    const lineNumbers: LineNumbersType | undefined =
      lineNumberOffset > 0 ? (n: number) => String(n + lineNumberOffset) : undefined;
    return {
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      fontSize: 13,
      readOnly,
      domReadOnly: readOnly,
      ...(lineNumbers && { lineNumbers }),
    };
  }, [lineNumberOffset, readOnly]);

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

export const TAB_DEFINITIONS: Array<{ id: QueryTab; label: string }> = [
  {
    id: 'base',
    label: i18n.translate('xpack.alertingV2.composeDiscover.tabs.baseQueryLabel', {
      defaultMessage: 'Base query',
    }),
  },
  {
    id: 'alert',
    label: i18n.translate('xpack.alertingV2.composeDiscover.tabs.alertQueryLabel', {
      defaultMessage: 'Alert query',
    }),
  },
  {
    id: 'recovery',
    label: i18n.translate('xpack.alertingV2.composeDiscover.tabs.recoveryQueryLabel', {
      defaultMessage: 'Recovery query',
    }),
  },
];

export const ComposeDiscoverTabs: React.FC<ComposeDiscoverTabsProps> = ({
  baseQuery,
  alertBlock,
  recoveryBlock,
  onBaseQueryChange,
  onAlertBlockChange,
  onRecoveryBlockChange,
  activeTab,
  onTabChange,
  tabs,
  onAlertEditorMount,
  onRecoveryEditorMount,
  hideTabBar = false,
  readOnly = false,
}) => {
  const visibleTabs = TAB_DEFINITIONS.filter((t) => tabs.includes(t.id));

  const safeActiveTab: QueryTab =
    tabs.length > 0 && tabs.includes(activeTab) ? activeTab : tabs[0] ?? 'alert';

  useEffect(() => {
    if (safeActiveTab !== activeTab) {
      onTabChange(safeActiveTab);
    }
  }, [safeActiveTab, activeTab, onTabChange]);

  const baseLineCount = baseQuery.split('\n').length;

  const renderEditor = () => {
    switch (safeActiveTab) {
      case 'base':
        return (
          <BlockEditor
            value={baseQuery}
            onChange={onBaseQueryChange}
            lineNumberOffset={0}
            readOnly={readOnly}
          />
        );
      case 'alert':
        return (
          <>
            {baseQuery && <LockedBaseEditor query={baseQuery} />}
            <BlockEditor
              value={alertBlock}
              onChange={onAlertBlockChange}
              lineNumberOffset={baseLineCount}
              onEditorMount={onAlertEditorMount}
              readOnly={readOnly}
            />
          </>
        );
      case 'recovery':
        return (
          <>
            {baseQuery && <LockedBaseEditor query={baseQuery} />}
            <BlockEditor
              value={recoveryBlock}
              onChange={onRecoveryBlockChange}
              lineNumberOffset={baseLineCount}
              onEditorMount={onRecoveryEditorMount}
              readOnly={readOnly}
            />
          </>
        );
      default:
        return (
          <EuiPanel color="subdued" paddingSize="l">
            <EuiText size="s" color="subdued" textAlign="center">
              <FormattedMessage
                id="xpack.alertingV2.composeDiscover.tabs.noEditorDescription"
                defaultMessage="No editor available for this tab."
              />
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
                onClick={() => onTabChange(tab.id)}
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
