/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormContext } from 'react-hook-form';
import {
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ComposeDiscoverState, ComposeDiscoverAction } from './types';
import type { FormValues } from '../../form/types';
import { QuerySummary } from './query_summary';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { RuleDetailsFieldGroup, RuleExecutionFieldGroup } from '../../form';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

// ── Step content renderers ────────────────────────────────────────────────────

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

  // Only fetch date fields when the query has a committed, valid index pattern
  const queryForFields =
    /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(state.fullQuery) && state.queryCommitted
      ? state.fullQuery
      : '';
  const { data: fieldMap } = useDataFields({
    query: queryForFields,
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
      ) : (
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
          selectedOptions={groupFields.map((f) => ({ label: f }))}
          onChange={(opts) =>
            setValue('grouping', opts.length ? { fields: opts.map((o) => o.label) } : undefined)
          }
          onCreateOption={(val) => setValue('grouping', { fields: [...groupFields, val] })}
          placeholder="Add group fields"
          data-test-subj="composeDiscoverGroupFields"
        />
      </EuiFormRow>

      {/* Schedule and lookback — connected to RHF via useFormContext() internally */}
      <RuleExecutionFieldGroup />
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
  // Route by step index — avoids silent breakage if step titles change
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
};
