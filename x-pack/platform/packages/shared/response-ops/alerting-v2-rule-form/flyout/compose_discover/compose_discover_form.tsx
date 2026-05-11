/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import {
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ComposeDiscoverState, ComposeDiscoverAction } from './types';
import { QuerySummary } from './query_summary';
import { getStepTitles } from './use_compose_discover_state';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { RuleDetailsFieldGroup, RuleExecutionFieldGroup } from '../../form';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

const NO_DATA_OPTIONS = [
  { value: 'no-longer-present', text: 'Alert as "no longer present"' },
  { value: 'do-nothing', text: 'Do nothing' },
  { value: 'keep-last', text: 'Keep last known state' },
];

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
  const { data: fieldMap } = useDataFields({
    query: state.queryCommitted ? state.fullQuery : '',
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

      {/* Time field and group fields sit close to query definitions */}
      <EuiSpacer size="m" />
      <EuiFormRow label="Time field" fullWidth>
        <EuiSelect
          fullWidth
          options={timeFieldOptions}
          value={state.timeField}
          onChange={(e) => dispatch({ type: 'SET_TIME_FIELD', timeField: e.target.value })}
          disabled={state.childOpen}
          data-test-subj="composeDiscoverTimeField"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFormRow label="Group fields" fullWidth>
        <EuiComboBox
          fullWidth
          selectedOptions={state.groupFields.map((f) => ({ label: f }))}
          onChange={(opts) =>
            dispatch({ type: 'SET_GROUP_FIELDS', fields: opts.map((o) => o.label) })
          }
          onCreateOption={(val) =>
            dispatch({ type: 'SET_GROUP_FIELDS', fields: [...state.groupFields, val] })
          }
          placeholder="Add group fields"
          data-test-subj="composeDiscoverGroupFields"
        />
      </EuiFormRow>

      <RuleExecutionFieldGroup />
    </>
  );
}

function DetailsAndArtifactsStep({
  state,
  dispatch,
}: {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}) {
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
function NotificationsStep({
  state: _state,
  dispatch: _dispatch,
}: {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}) {
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

function buildYaml(state: ComposeDiscoverState): string {
  const fullQuery = state.fullQuery || '';
  const indent = (s: string) => s.split('\n').join('\n      ');

  return `kind: alert
metadata:
  name: "${state.name}"
  tags: [${state.tags.map((t) => `"${t}"`).join(', ')}]
  description: ""
evaluation:
  query:
    base: |
      ${indent(fullQuery)}
grouping:
  fields: [${state.groupFields.map((f) => `"${f}"`).join(', ')}]
timeField: "${state.timeField}"
schedule:
  every: "${state.schedule}"
  lookback: "${state.lookback}"
stateTransition:
  alertDelay: { type: "${state.alertDelayMode}" }
  recoveryDelay: { type: "${state.recoveryDelayMode}" }
`;
}

export const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps> = ({ state, dispatch, services }) => {
  const yamlValue = useMemo(() => buildYaml(state), [state]);

  if (state.yamlMode) {
    return (
      <CodeEditor
        languageId="yaml"
        value={yamlValue}
        onChange={(val) => {
          // Two-way sync: update name field as a simple proof-of-concept
          // Full YAML→state parsing is out of scope for this prototype
          void val;
        }}
        height={600}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          fontSize: 13,
          wordWrap: 'on',
        }}
      />
    );
  }

  const stepTitles = getStepTitles();
  const currentStepName = stepTitles[state.step] ?? '';

  if (currentStepName === 'Alert Condition') {
    return <AlertConditionStep state={state} dispatch={dispatch} services={services} />;
  }

  if (currentStepName === 'Details & Artifacts') {
    return <DetailsAndArtifactsStep state={state} dispatch={dispatch} />;
  }

  if (currentStepName === 'Notifications') {
    return <NotificationsStep state={state} dispatch={dispatch} />;
  }

  return null;
};
