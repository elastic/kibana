/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiTab, EuiTabs, EuiSpacer, EuiPanel, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CodeEditor, ESQL_LANG_ID, type monaco } from '@kbn/code-editor';
import type { RuleQuery } from '../../form/types';
import type { QueryTab } from './types';
import { MIN_EDITOR_HEIGHT, ESQL_EDITOR_LINE_HEIGHT, ESQL_CODE_EDITOR_OPTIONS } from './constants';

type IStandaloneCodeEditor = monaco.editor.IStandaloneCodeEditor;

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
  dataTestSubj?: string;
}

const SPLIT_EDITOR_CONTAINER_STYLES: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

const BLOCK_EDITOR_WRAPPER_STYLES: React.CSSProperties = {
  flex: '1 1 0',
  minHeight: MIN_EDITOR_HEIGHT,
};

const LOCKED_BASE_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
  ...ESQL_CODE_EDITOR_OPTIONS,
  // Drop bottom padding so the locked base sits flush against the block editor below.
  padding: { top: ESQL_CODE_EDITOR_OPTIONS.padding?.top, bottom: 0 },
  readOnly: true,
  domReadOnly: true,
  scrollbar: { vertical: 'hidden', horizontal: 'hidden' },
  renderLineHighlight: 'none',
  overviewRulerLanes: 0,
};

const LockedBaseEditor: React.FC<LockedBaseEditorProps> = ({ query, dataTestSubj }) => {
  const [height, setHeight] = useState(() => query.split('\n').length * ESQL_EDITOR_LINE_HEIGHT);

  const handleEditorMount = useCallback((editor: IStandaloneCodeEditor) => {
    const updateHeight = () => setHeight(editor.getContentHeight());
    updateHeight();
    editor.onDidContentSizeChange(updateHeight);
  }, []);

  return (
    <div style={{ ...LOCKED_EDITOR_STYLES, height, flexShrink: 0 }}>
      <CodeEditor
        languageId={ESQL_LANG_ID}
        value={query}
        height={height}
        options={LOCKED_BASE_EDITOR_OPTIONS}
        editorDidMount={handleEditorMount}
        dataTestSubj={dataTestSubj}
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
  /** Drop top padding so this editor sits flush against the locked base above. */
  flushTop?: boolean;
  dataTestSubj?: string;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  value,
  onChange,
  lineNumberOffset,
  onEditorMount,
  readOnly = false,
  flushTop = false,
  dataTestSubj,
}) => {
  const options = useMemo(
    (): monaco.editor.IStandaloneEditorConstructionOptions => ({
      ...ESQL_CODE_EDITOR_OPTIONS,
      readOnly,
      domReadOnly: readOnly,
      lineNumbers: lineNumberOffset > 0 ? (n: number) => String(n + lineNumberOffset) : 'on',
      ...(flushTop
        ? { padding: { top: 0, bottom: ESQL_CODE_EDITOR_OPTIONS.padding?.bottom } }
        : {}),
    }),
    [lineNumberOffset, readOnly, flushTop]
  );

  return (
    <CodeEditor
      languageId={ESQL_LANG_ID}
      value={value}
      onChange={onChange}
      height="100%"
      options={options}
      editorDidMount={onEditorMount}
      dataTestSubj={dataTestSubj}
    />
  );
};

export const ALERT_TAB_DISABLED_TOOLTIP = i18n.translate(
  'xpack.alertingV2.composeDiscover.tabs.alertTabDisabledTooltip',
  {
    defaultMessage: 'Define a base query before adding an alert condition',
  }
);

export const isAlertTabDisabled = (
  tabs: QueryTab[],
  baseQueryOrRuleQuery: string | RuleQuery
): boolean => {
  if (!tabs.includes('alert')) {
    return false;
  }

  if (typeof baseQueryOrRuleQuery === 'string') {
    return baseQueryOrRuleQuery.trim().length === 0;
  }

  if (baseQueryOrRuleQuery.format === 'composed') {
    return baseQueryOrRuleQuery.base.trim().length === 0;
  }

  const base = baseQueryOrRuleQuery.no_data?.query ?? '';
  if (base.trim().length > 0) {
    return false;
  }

  return baseQueryOrRuleQuery.breach.query.trim().length === 0;
};

export const resolveActiveQueryTab = (
  tabs: QueryTab[],
  activeTab: QueryTab,
  baseQuery: string
): QueryTab => {
  if (tabs.length === 0) return 'alert';
  if (tabs.includes(activeTab) && !(activeTab === 'alert' && isAlertTabDisabled(tabs, baseQuery))) {
    return activeTab;
  }
  if (tabs.includes('base')) return 'base';
  return tabs[0] ?? 'alert';
};

interface QueryTabButtonProps {
  tab: { id: QueryTab; label: string };
  isSelected: boolean;
  onSelect: (tab: QueryTab) => void;
  baseQuery: string;
  tabs: QueryTab[];
  dataTestSubjPrefix: string;
}

export const QueryTabButton: React.FC<QueryTabButtonProps> = ({
  tab,
  isSelected,
  onSelect,
  baseQuery,
  tabs,
  dataTestSubjPrefix,
}) => {
  const disabled = tab.id === 'alert' && isAlertTabDisabled(tabs, baseQuery);
  const handleSelect = () => {
    if (disabled) {
      return;
    }
    onSelect(tab.id);
  };
  const tabElement = (
    <EuiTab
      isSelected={isSelected}
      onClick={handleSelect}
      disabled={disabled}
      data-test-subj={`${dataTestSubjPrefix}-${tab.id}`}
    >
      {tab.label}
    </EuiTab>
  );

  if (!disabled) {
    return tabElement;
  }

  return (
    <EuiToolTip content={ALERT_TAB_DISABLED_TOOLTIP}>
      <span tabIndex={0} style={{ display: 'inline-flex' }}>
        {tabElement}
      </span>
    </EuiToolTip>
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

  const safeActiveTab = resolveActiveQueryTab(tabs, activeTab, baseQuery);

  useEffect(() => {
    if (safeActiveTab !== activeTab) {
      onTabChange(safeActiveTab);
    }
  }, [safeActiveTab, activeTab, onTabChange]);

  const baseLineCount = baseQuery.split('\n').length;

  const blockEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if ((safeActiveTab === 'alert' || safeActiveTab === 'recovery') && blockEditorRef.current) {
      blockEditorRef.current.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }
  }, [safeActiveTab]);

  const renderEditor = () => {
    switch (safeActiveTab) {
      case 'base':
        return (
          <BlockEditor
            value={baseQuery}
            onChange={onBaseQueryChange}
            lineNumberOffset={0}
            readOnly={readOnly}
            dataTestSubj="composeDiscoverBlockEditor-base"
          />
        );
      case 'alert':
        return (
          <div style={SPLIT_EDITOR_CONTAINER_STYLES}>
            {baseQuery && (
              <LockedBaseEditor query={baseQuery} dataTestSubj="composeDiscoverLockedBaseEditor" />
            )}
            <div ref={blockEditorRef} style={BLOCK_EDITOR_WRAPPER_STYLES}>
              <BlockEditor
                value={alertBlock}
                onChange={onAlertBlockChange}
                lineNumberOffset={baseLineCount}
                onEditorMount={onAlertEditorMount}
                readOnly={readOnly}
                flushTop={Boolean(baseQuery)}
                dataTestSubj="composeDiscoverBlockEditor-alert"
              />
            </div>
          </div>
        );
      case 'recovery':
        return (
          <div style={SPLIT_EDITOR_CONTAINER_STYLES}>
            {baseQuery && (
              <LockedBaseEditor query={baseQuery} dataTestSubj="composeDiscoverLockedBaseEditor" />
            )}
            <div ref={blockEditorRef} style={BLOCK_EDITOR_WRAPPER_STYLES}>
              <BlockEditor
                value={recoveryBlock}
                onChange={onRecoveryBlockChange}
                lineNumberOffset={baseLineCount}
                onEditorMount={onRecoveryEditorMount}
                readOnly={readOnly}
                flushTop={Boolean(baseQuery)}
                dataTestSubj="composeDiscoverBlockEditor-recovery"
              />
            </div>
          </div>
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
              <QueryTabButton
                key={tab.id}
                tab={tab}
                isSelected={safeActiveTab === tab.id}
                onSelect={onTabChange}
                baseQuery={baseQuery}
                tabs={tabs}
                dataTestSubjPrefix="composeDiscoverTab"
              />
            ))}
          </EuiTabs>
          <EuiSpacer size="m" />
        </>
      )}
      {renderEditor()}
    </>
  );
};
