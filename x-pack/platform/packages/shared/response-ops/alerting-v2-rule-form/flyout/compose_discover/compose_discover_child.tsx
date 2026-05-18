/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTabs,
  EuiTab,
  EuiPanel,
} from '@elastic/eui';
import type { monaco } from '@kbn/code-editor';
import type { ComposeFormValues } from './compose_form_types';
import { getBreachQuery } from './compose_form_types';
import { useRuleFormServices } from '../../form/contexts/rule_form_context';
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  SandboxTabConfig,
  SandboxApplyData,
} from './types';
import { DiscoverSandboxPanel } from './discover_sandbox_panel';
import { ComposeDiscoverTabs, TAB_DEFINITIONS, visibleTabIds } from './compose_discover_tabs';

interface ComposeDiscoverChildProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  /** Controls whether the Sandbox renders a single editor or a Base/Alert/Recovery tab layout. */
  tabConfig: SandboxTabConfig;
  onAlertEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onRecoveryEditorMount?: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onClose: () => void;
  /** Called when the user clicks "Apply changes". The parent writes the query
   *  into react-hook-form (the source of truth) and updates the reducer cache. */
  onApply: (data: SandboxApplyData) => void;
}

const CHILD_FLYOUT_TITLE_ID = 'composeDiscoverChildTitle';
const INITIAL_EDITOR_HEIGHT = 200;
const MIN_EDITOR_HEIGHT = 80;
const MAX_EDITOR_HEIGHT = 600;

export const ComposeDiscoverChild: React.FC<ComposeDiscoverChildProps> = ({
  state,
  dispatch,
  tabConfig,
  onAlertEditorMount,
  onRecoveryEditorMount,
  onClose,
  onApply,
}) => {
  const services = useRuleFormServices();
  const isSplit = tabConfig.type !== 'single';
  const [localQuery, setLocalQuery] = useState(state.fullQuery);
  const [localBaseQuery, setLocalBaseQuery] = useState(state.baseQuery);
  const [localAlertBlock, setLocalAlertBlock] = useState(state.alertBlock);
  const [localRecoveryBlock, setLocalRecoveryBlock] = useState(state.recoveryBlock);

  const { setValue: setFormValue, watch: watchForm } = useFormContext<ComposeFormValues>();
  const timeField = watchForm('timeField') ?? '@timestamp';
  const formQuery = getBreachQuery(watchForm('query'));

  // In single mode, sync localQuery when react-hook-form's query changes
  // externally (e.g. from YAML edits that debounce into the form).
  useEffect(() => {
    if (!isSplit) {
      setLocalQuery(formQuery);
    }
  }, [formQuery, isSplit]);

  const dateStart = state.sandboxDateStart;
  const dateEnd = state.sandboxDateEnd;

  // In split mode the "active" query for execution is the full assembled query.
  const activeQuery = isSplit
    ? [localBaseQuery, localAlertBlock].filter(Boolean).join('\n')
    : localQuery;

  const handleDone = useCallback(() => {
    onApply({
      isSplit,
      fullQuery: localQuery,
      baseQuery: localBaseQuery,
      alertBlock: localAlertBlock,
      recoveryBlock: localRecoveryBlock,
    });
  }, [isSplit, localQuery, localBaseQuery, localAlertBlock, localRecoveryBlock, onApply]);

  const splitTabs = useMemo(() => {
    if (!isSplit) return [];
    const tabIds = visibleTabIds(tabConfig);
    return TAB_DEFINITIONS.filter((t) => tabIds.includes(t.id));
  }, [isSplit, tabConfig]);

  const editorPanelStyles: React.CSSProperties = useMemo(
    () => ({
      resize: 'vertical' as const,
      overflow: 'auto',
      height: INITIAL_EDITOR_HEIGHT,
      minHeight: MIN_EDITOR_HEIGHT,
      maxHeight: MAX_EDITOR_HEIGHT,
    }),
    []
  );

  const splitEditorSlot = isSplit ? (
    <>
      {splitTabs.length > 0 && (
        <>
          <EuiTabs>
            {splitTabs.map((tab) => (
              <EuiTab
                key={tab.id}
                isSelected={state.activeTab === tab.id}
                onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
                data-test-subj={`composeDiscoverTab-${tab.id}`}
              >
                {tab.label}
              </EuiTab>
            ))}
          </EuiTabs>
          <EuiSpacer size="s" />
        </>
      )}
      <EuiPanel hasBorder paddingSize="s" style={editorPanelStyles}>
        <ComposeDiscoverTabs
          baseQuery={localBaseQuery}
          alertBlock={localAlertBlock}
          recoveryBlock={localRecoveryBlock}
          onBaseQueryChange={setLocalBaseQuery}
          onAlertBlockChange={setLocalAlertBlock}
          onRecoveryBlockChange={setLocalRecoveryBlock}
          activeTab={state.activeTab}
          onTabChange={(tab) => dispatch({ type: 'SET_TAB', tab })}
          tabConfig={tabConfig}
          onAlertEditorMount={onAlertEditorMount}
          onRecoveryEditorMount={onRecoveryEditorMount}
          hideTabBar
        />
      </EuiPanel>
    </>
  ) : undefined;

  return (
    <EuiFlyout type="overlay" size="fill" onClose={onClose} aria-labelledby={CHILD_FLYOUT_TITLE_ID}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s" id={CHILD_FLYOUT_TITLE_ID}>
          <h3>{state.queryCommitted ? 'Edit alert query' : 'Define alert query'}</h3>
        </EuiTitle>
        {!state.queryCommitted && (
          <EuiText size="s" color="subdued">
            Write the ES|QL query that defines when this rule should alert. You&apos;ll configure
            the rest of the rule settings next.
          </EuiText>
        )}
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <DiscoverSandboxPanel
          query={activeQuery}
          timeField={timeField}
          dateStart={dateStart}
          dateEnd={dateEnd}
          onDateRangeChange={(start, end) =>
            dispatch({ type: 'SET_SANDBOX_DATE_RANGE', start, end })
          }
          onTimeFieldChange={(field) => setFormValue('timeField', field)}
          onQueryChange={isSplit ? undefined : setLocalQuery}
          services={{ http: services.http, data: services.data, dataViews: services.dataViews }}
          editorSlot={splitEditorSlot}
        />
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={handleDone} data-test-subj="composeDiscoverChildDone">
              Apply changes
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
