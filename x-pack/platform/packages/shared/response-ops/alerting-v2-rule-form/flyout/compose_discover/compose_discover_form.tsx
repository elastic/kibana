/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { Parser, isColumn } from '@elastic/esql';
import { useQuery } from '@kbn/react-query';
import { getEsqlColumns } from '@kbn/esql-utils';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import type { ComposeDiscoverState, ComposeDiscoverAction, RecoveryType } from './types';
import type { FormValues } from '../../form/types';
import { QuerySummary } from './query_summary';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { splitQuery } from './use_heuristic_split';
import { RuleDetailsFieldGroup } from '../../form';
import { ScheduleField } from '../../form/fields/schedule_field';
import { LookbackWindowField } from '../../form/fields/lookback_window_field';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

// ── Recovery type selector ────────────────────────────────────────────────────

const RECOVERY_TYPE_OPTIONS: Array<{
  value: RecoveryType;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
}> = [
  {
    value: 'default',
    inputDisplay: 'Default recovery',
    dropdownDisplay: (
      <>
        <strong>Default recovery</strong>
        <EuiText size="s" color="subdued">
          <p>Recover automatically when the alert condition is no longer met.</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'custom',
    inputDisplay: 'Custom recovery',
    dropdownDisplay: (
      <>
        <strong>Custom recovery</strong>
        <EuiText size="s" color="subdued">
          <p>Define a custom recovery condition.</p>
        </EuiText>
      </>
    ),
  },
];

interface RecoveryTypeSelectorProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}

const RecoveryTypeSelector: React.FC<RecoveryTypeSelectorProps> = ({ state, dispatch }) => (
  <EuiFormRow label="Recovery" fullWidth>
    <EuiSuperSelect
      options={RECOVERY_TYPE_OPTIONS}
      valueOfSelected={state.recoveryType}
      onChange={(val) => dispatch({ type: 'SET_RECOVERY_TYPE', recoveryType: val as RecoveryType })}
      fullWidth
      hasDividers
      data-test-subj="composeDiscoverRecoveryType"
    />
  </EuiFormRow>
);

// ── Step renderers ────────────────────────────────────────────────────────────

function AlertConditionStep({
  state,
  dispatch,
  services,
}: {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}) {
  const { setValue, watch } = useFormContext<FormValues>();
  const timeField = watch('timeField') ?? '@timestamp';
  const grouping = watch('grouping');
  const groupFields = grouping?.fields ?? [];

  // Use the base query for field lookup when tracking is on; fall back to fullQuery.
  const committedQuery = useMemo(() => {
    const q = state.tracking ? state.baseQuery : state.fullQuery;
    return /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(q) && state.queryCommitted ? q : '';
  }, [state.tracking, state.baseQuery, state.fullQuery, state.queryCommitted]);

  const { data: fieldMap } = useDataFields({
    query: committedQuery,
    http: services.http,
    dataViews: services.dataViews,
  });
  const timeFieldOptions = useMemo(() => {
    const dateFields = Object.values(fieldMap ?? {})
      .filter((f) => f.type === 'date')
      .map((f) => f.name)
      .sort();
    if (!dateFields.includes('@timestamp')) dateFields.unshift('@timestamp');
    return dateFields.map((name) => ({ value: name, text: name }));
  }, [fieldMap]);

  // Output columns of the full pipeline → options for the group fields selector.
  // Uses | LIMIT 0 so no data is transferred — only the output schema is returned.
  // Works in edit mode (query seeded on mount) without requiring the sandbox to be opened.
  const { data: outputColumns = [] } = useQuery({
    queryKey: ['composeDiscoverOutputColumns', committedQuery],
    queryFn: async () => {
      const cols = await getEsqlColumns({
        esqlQuery: committedQuery,
        search: services.data.search.search,
      });
      return cols.map((c) => c.name);
    },
    enabled: Boolean(committedQuery),
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });

  // Auto-populate group fields from the STATS BY clause when a query is first committed
  // and the user hasn't already set any group fields.
  const autoPopulatedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.queryCommitted || groupFields.length > 0 || !committedQuery) return;
    if (autoPopulatedForRef.current === committedQuery) return;
    autoPopulatedForRef.current = committedQuery;
    try {
      const { root } = Parser.parse(committedQuery);
      const statsCmd = [...root.commands].reverse().find((c) => c.name === 'stats');
      interface AstNode {
        type: string;
        name: string;
        args?: unknown[];
      }
      const byOption = (statsCmd?.args as AstNode[] | undefined)?.find(
        (a) => a.type === 'option' && a.name === 'by'
      );
      const byFields = (byOption?.args ?? []).filter(isColumn).map((a) => a.name);
      if (byFields.length > 0) setValue('grouping', { fields: byFields });
    } catch {
      // Non-parseable query — skip auto-populate
    }
  }, [state.queryCommitted, committedQuery, groupFields.length, setValue]);

  const handleTrackingToggle = useCallback(() => {
    if (state.tracking) {
      dispatch({ type: 'DISABLE_TRACKING' });
    } else {
      const currentQuery = state.fullQuery;
      const { base, alertBlock } = splitQuery(currentQuery);
      dispatch({ type: 'ENABLE_TRACKING', base, alertBlock });
    }
  }, [state.tracking, state.fullQuery, dispatch]);

  // Callout when the heuristic split couldn't find a clear split point
  const splitFailed = state.tracking && !state.baseQuery && state.queryCommitted;

  return (
    <>
      <EuiTitle size="xs">
        <h3>ES|QL query</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {!state.queryCommitted ? (
        <>
          <EuiPanel color="subdued" paddingSize="m">
            <EuiText size="s" color="subdued">
              No query defined yet
            </EuiText>
          </EuiPanel>
          <EuiSpacer size="s" />
          <EuiButton
            iconType="editorCodeBlock"
            isDisabled={state.childOpen}
            onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
            data-test-subj="composeDiscoverOpenEditor"
          >
            Open query editor
          </EuiButton>
        </>
      ) : !state.tracking ? (
        <>
          <QuerySummary query={state.fullQuery} label="query" />
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            iconType="editorCodeBlock"
            isDisabled={state.childOpen}
            onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
            data-test-subj="composeDiscoverEditQuery"
          >
            Edit query
          </EuiButton>
        </>
      ) : (
        <>
          {splitFailed && (
            <>
              <EuiCallOut
                announceOnMount={false}
                size="s"
                color="primary"
                iconType="iInCircle"
                title="Couldn't automatically separate base query from alert condition. Adjust the split in the query editor."
              />
              <EuiSpacer size="s" />
            </>
          )}
          <EuiText size="xs" color="subdued">
            <strong>Base query</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <QuerySummary query={state.baseQuery} label="base query" />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <strong>Alert condition</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <QuerySummary query={state.alertBlock} label="alert condition" />
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            iconType="editorCodeBlock"
            isDisabled={state.childOpen}
            onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
            data-test-subj="composeDiscoverEditQueries"
          >
            Edit queries
          </EuiButton>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiFormRow label="Time field" fullWidth>
        <EuiSelect
          fullWidth
          options={timeFieldOptions}
          value={timeField}
          onChange={(e) => setValue('timeField', e.target.value)}
          disabled={state.childOpen}
          data-test-subj="composeDiscoverTimeField"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label="Group fields" fullWidth>
        <EuiComboBox
          fullWidth
          options={outputColumns.map((name) => ({ label: name }))}
          selectedOptions={groupFields.map((f) => ({ label: f }))}
          onChange={(opts) =>
            setValue('grouping', opts.length ? { fields: opts.map((o) => o.label) } : undefined)
          }
          onCreateOption={(val) => setValue('grouping', { fields: [...groupFields, val] })}
          placeholder="Add group fields"
          data-test-subj="composeDiscoverGroupFields"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />
      <EuiSwitch
        label="Track active and recovered state over time"
        checked={state.tracking}
        onChange={handleTrackingToggle}
        disabled={!state.queryCommitted}
        data-test-subj="composeDiscoverTrackingToggle"
      />

      {/* Schedule and lookback — connected to RHF via useFormContext() internally */}
      <EuiSpacer size="m" />
      <ScheduleField />
      <EuiSpacer size="m" />
      <LookbackWindowField />
    </>
  );
}

function RecoveryConditionStep({
  state,
  dispatch,
}: {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}) {
  return (
    <>
      <RecoveryTypeSelector state={state} dispatch={dispatch} />

      {state.recoveryType === 'custom' && (
        <>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <strong>Base query</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <QuerySummary query={state.baseQuery} label="base query" />
          <EuiSpacer size="m" />
          <EuiText size="xs" color="subdued">
            <strong>Recovery condition</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <QuerySummary query={state.recoveryBlock} label="recovery condition" />
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="editorCodeBlock"
                isDisabled={state.childOpen}
                onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
                data-test-subj="composeDiscoverEditRecovery"
              >
                Edit recovery query
              </EuiButton>
            </EuiFlexItem>
            {state.recoveryBlock && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="success">Custom condition set</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
    </>
  );
}

function DetailsAndArtifactsStep() {
  return (
    <>
      {/* Name, description, tags — connected to RHF via useFormContext() internally */}
      <RuleDetailsFieldGroup />

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xs">
        <h3>Artifacts</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {/* TODO (#268770): wire runbook URL and dashboard link to FormValues.artifacts */}
      <EuiFormRow label="Runbook URL" fullWidth labelAppend={<EuiText size="xs">Optional</EuiText>}>
        <EuiFieldText fullWidth placeholder="https://..." disabled />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label="Dashboard link"
        fullWidth
        labelAppend={<EuiText size="xs">Optional</EuiText>}
      >
        <EuiFieldText fullWidth placeholder="https://..." disabled />
      </EuiFormRow>
    </>
  );
}

// TODO (#268770): Notifications step — wire workflow selector and notification policy fields
// to FormValues once the action policy API integration is in place.
function NotificationsStep() {
  return (
    <EuiCallOut
      title="Notifications configuration coming soon"
      iconType="clock"
      color="primary"
      size="s"
    >
      <p>
        Notification policies will be configurable here. Rules are created without notifications
        until this step is wired.
      </p>
    </EuiCallOut>
  );
}

// ── Main form component ───────────────────────────────────────────────────────

export const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps> = ({
  state,
  dispatch,
  services,
}) => {
  // Route by step index — avoids silent breakage if step titles change.
  // When tracking is off: 0=Alert 1=Details 2=Notifications
  // When tracking is on:  0=Alert 1=Recovery 2=Details 3=Notifications
  if (!state.tracking) {
    switch (state.step) {
      case 0:
        return <AlertConditionStep state={state} dispatch={dispatch} services={services} />;
      case 1:
        return <DetailsAndArtifactsStep />;
      case 2:
        return <NotificationsStep />;
      default:
        return null;
    }
  }

  switch (state.step) {
    case 0:
      return <AlertConditionStep state={state} dispatch={dispatch} services={services} />;
    case 1:
      return <RecoveryConditionStep state={state} dispatch={dispatch} />;
    case 2:
      return <DetailsAndArtifactsStep />;
    case 3:
      return <NotificationsStep />;
    default:
      return null;
  }
};
