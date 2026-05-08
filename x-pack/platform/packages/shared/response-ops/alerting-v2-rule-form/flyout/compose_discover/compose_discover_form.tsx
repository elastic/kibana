/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, type FC } from 'react';
import { CodeEditor } from '@kbn/code-editor';
import { ESQL_LANG_ID } from '@kbn/monaco';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSuperSelect,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ComposeDiscoverState, ComposeDiscoverAction, DelayMode, RecoveryType } from './types';
import { QuerySummary } from './query_summary';
import { splitQuery } from './use_heuristic_split';
import { getStepTitles } from './use_compose_discover_state';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

const SCHEDULE_UNITS = [
  { value: 's', text: 'seconds' },
  { value: 'm', text: 'minutes' },
  { value: 'h', text: 'hours' },
  { value: 'd', text: 'days' },
];

const DELAY_MODE_OPTIONS: Array<{ id: DelayMode; label: string }> = [
  { id: 'immediate', label: 'Immediate' },
  { id: 'breaches', label: 'Consecutive' },
  { id: 'duration', label: 'Duration' },
];

const NO_DATA_OPTIONS = [
  { value: 'no-longer-present', text: 'Alert as "no longer present"' },
  { value: 'do-nothing', text: 'Do nothing' },
  { value: 'keep-last', text: 'Keep last known state' },
];

function parseDurationParts(dur: string): { value: number; unit: string } {
  const match = dur.match(/^(\d+)([smhd])$/);
  return match ? { value: parseInt(match[1], 10), unit: match[2] } : { value: 1, unit: 'm' };
}

// ── Shared sub-components ────────────────────────────────────────────────────

interface DelayFieldProps {
  label: string;
  mode: DelayMode;
  value: number;
  onModeChange: (mode: DelayMode) => void;
  onValueChange: (value: number) => void;
  testSubj?: string;
}

const DelayField: React.FC<DelayFieldProps> = ({
  label,
  mode,
  value,
  onModeChange,
  onValueChange,
  testSubj,
}) => (
  <>
    <EuiFormRow label={label} fullWidth>
      <EuiButtonGroup
        legend={label}
        options={DELAY_MODE_OPTIONS}
        idSelected={mode}
        onChange={(id) => onModeChange(id as DelayMode)}
        isFullWidth
        data-test-subj={testSubj}
      />
    </EuiFormRow>
    {mode !== 'immediate' && (
      <EuiFormRow
        label={mode === 'breaches' ? 'Consecutive breaches' : 'Duration'}
        fullWidth
      >
        <EuiFieldNumber
          fullWidth
          min={1}
          value={value}
          onChange={(e) => onValueChange(parseInt(e.target.value, 10) || 1)}
        />
      </EuiFormRow>
    )}
  </>
);

interface EvalFieldsProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}

const EvalFields: React.FC<EvalFieldsProps> = ({ state, dispatch }) => {
  const scheduleParts = parseDurationParts(state.schedule);
  const lookbackParts = parseDurationParts(state.lookback);

  return (
    <>
      <EuiHorizontalRule margin="m" />
      <EuiTitle size="xs">
        <h3>Evaluation</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFormRow label="Schedule" fullWidth>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  min={1}
                  value={scheduleParts.value}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    dispatch({ type: 'SET_SCHEDULE', schedule: `${val}${scheduleParts.unit}` });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  options={SCHEDULE_UNITS}
                  value={scheduleParts.unit}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_SCHEDULE',
                      schedule: `${scheduleParts.value}${e.target.value}`,
                    })
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow label="Lookback" fullWidth>
            <EuiFlexGroup gutterSize="s">
              <EuiFlexItem>
                <EuiFieldNumber
                  min={1}
                  value={lookbackParts.value}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    dispatch({ type: 'SET_LOOKBACK', lookback: `${val}${lookbackParts.unit}` });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  options={SCHEDULE_UNITS}
                  value={lookbackParts.unit}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_LOOKBACK',
                      lookback: `${lookbackParts.value}${e.target.value}`,
                    })
                  }
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

    </>
  );
};

// ── Recovery type selector (used in both opt1 step 1 and opt2 inline) ────────

const RECOVERY_TYPE_OPTIONS = [
  {
    value: 'default' as RecoveryType,
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
    value: 'no-recovery' as RecoveryType,
    inputDisplay: 'No recovery',
    disabled: true,
    dropdownDisplay: (
      <EuiFlexGroup gutterSize="s" direction="column" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}><strong>No recovery</strong></EuiFlexItem>
            <EuiFlexItem grow={false}><EuiBadge>Coming soon</EuiBadge></EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued"><p>Disable recovery alerts.</p></EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
  },
  {
    value: 'custom' as RecoveryType,
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
      onChange={(val) => dispatch({ type: 'SET_RECOVERY_TYPE', recoveryType: val })}
      fullWidth
      hasDividers
      data-test-subj="composeDiscoverRecoveryType"
    />
  </EuiFormRow>
);

// ── Step content renderers ────────────────────────────────────────────────────

function AlertConditionStep({
  state,
  dispatch,
  isOpt2,
  services,
}: {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  isOpt2: boolean;
  services: RuleFormServices;
}) {
  // Fetch date fields from the current query for the time field dropdown
  const activeQuery = state.queryCommitted
    ? state.tracking
      ? state.baseQuery
      : state.fullQuery
    : '';
  const { data: fieldMap } = useDataFields({
    query: activeQuery,
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

  const handleTrackingToggle = useCallback(() => {
    if (state.tracking) {
      dispatch({ type: 'DISABLE_TRACKING' });
    } else {
      const currentQuery = state.queryCommitted ? state.fullQuery : state.fullQuery;
      const { base, alertBlock } = splitQuery(currentQuery);
      dispatch({ type: 'ENABLE_TRACKING', base, alertBlock });
    }
  }, [state.tracking, state.fullQuery, dispatch]);

  const splitFailed =
    state.tracking &&
    splitQuery([state.baseQuery, state.alertBlock].join('\n')).confidence === 'none' &&
    !state.baseQuery;

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
                size="s"
                color="primary"
                iconType="iInCircle"
                title="We couldn't automatically separate your base query from the alert condition. You can adjust the split in the query editor."
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

      <EuiSpacer size="m" />

      <EuiSwitch
        label="Track active and recovered state over time"
        checked={state.tracking}
        onChange={handleTrackingToggle}
        data-test-subj="composeDiscoverTrackingToggle"
      />

      {/* In opt2, recovery selector appears inline on this step */}
      {isOpt2 && state.tracking && (
        <>
          <EuiSpacer size="l" />
          <EuiHorizontalRule margin="none" />
          <EuiSpacer size="l" />
          <RecoveryTypeSelector state={state} dispatch={dispatch} />
          {state.recoveryType === 'custom' && (
            <>
              <EuiSpacer size="m" />
              <EuiText size="xs" color="subdued">
                <strong>Recovery condition</strong>
              </EuiText>
              <EuiSpacer size="xs" />
              <QuerySummary query={state.recoveryBlock} label="recovery condition" />
              <EuiSpacer size="s" />
              <EuiButton
                size="s"
                iconType="editorCodeBlock"
                isDisabled={state.childOpen}
                onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
              >
                Edit queries
              </EuiButton>
            </>
          )}
        </>
      )}

      {state.tracking && (
        <>
          <EuiHorizontalRule margin="m" />
          <DelayField
            label="Alert delay"
            mode={state.alertDelayMode}
            value={state.alertDelayValue}
            onModeChange={(m) => dispatch({ type: 'SET_ALERT_DELAY_MODE', mode: m })}
            onValueChange={(v) => dispatch({ type: 'SET_ALERT_DELAY_VALUE', value: v })}
            testSubj="composeDiscoverAlertDelay"
          />
        </>
      )}

      <EvalFields state={state} dispatch={dispatch} />
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
          <EuiButton
            size="s"
            iconType="editorCodeBlock"
            isDisabled={state.childOpen}
            onClick={() => dispatch({ type: 'OPEN_CHILD_FOR_STEP', step: state.step })}
          >
            Edit queries
          </EuiButton>
          <EuiSpacer size="m" />
          <DelayField
            label="Recovery delay"
            mode={state.recoveryDelayMode}
            value={state.recoveryDelayValue}
            onModeChange={(m) => dispatch({ type: 'SET_RECOVERY_DELAY_MODE', mode: m })}
            onValueChange={(v) => dispatch({ type: 'SET_RECOVERY_DELAY_VALUE', value: v })}
            testSubj="composeDiscoverRecoveryDelay"
          />
        </>
      )}
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
      <EuiTitle size="xs">
        <h3>Rule details</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow label="Rule name" fullWidth>
        <EuiFieldText
          fullWidth
          value={state.name}
          onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
          placeholder="e.g. High CPU hosts"
          data-test-subj="composeDiscoverRuleName"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow label="Tags" fullWidth>
        <EuiComboBox
          fullWidth
          selectedOptions={state.tags.map((t) => ({ label: t }))}
          onChange={(opts) => dispatch({ type: 'SET_TAGS', tags: opts.map((o) => o.label) })}
          onCreateOption={(val) =>
            dispatch({ type: 'SET_TAGS', tags: [...state.tags, val] })
          }
          placeholder="Add tags"
          data-test-subj="composeDiscoverRuleTags"
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xs">
        <h3>No data behavior</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow
        label="When no data is returned"
        helpText="What to do when the query returns no results for the current evaluation window."
        fullWidth
      >
        <EuiSelect options={NO_DATA_OPTIONS} value="no-longer-present" fullWidth />
      </EuiFormRow>

      <EuiHorizontalRule margin="m" />

      <EuiTitle size="xs">
        <h3>Artifacts</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      <EuiFormRow label="Runbook URL" fullWidth labelAppend={<EuiText size="xs">Optional</EuiText>}>
        <EuiFieldText fullWidth placeholder="https://..." />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiFormRow
        label="Dashboard link"
        fullWidth
        labelAppend={<EuiText size="xs">Optional</EuiText>}
      >
        <EuiFieldText fullWidth placeholder="https://..." />
      </EuiFormRow>
    </>
  );
}

function NotificationsStep({
  state,
  dispatch,
}: {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
}) {
  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h3>Notifications</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge>Lite Policy</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            Send a notification when this rule&apos;s alerts change status. A linked action policy
            will be created with this rule.
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">Per-episode</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiSwitch
        label="Enable notifications"
        checked={state.notificationsEnabled}
        onChange={(e) =>
          dispatch({ type: 'SET_NOTIFICATIONS_ENABLED', enabled: e.target.checked })
        }
        data-test-subj="composeDiscoverNotificationsEnabled"
      />

      {state.notificationsEnabled && (
        <>
          <EuiSpacer size="m" />

          <EuiFormRow
            label="Workflow"
            fullWidth
            helpText="A single-step workflow that runs when this rule fires."
          >
            <EuiSelect
              options={[{ value: 'new', text: '+ Create new workflow...' }]}
              fullWidth
            />
          </EuiFormRow>

          <EuiSpacer size="m" />

          <EuiFormRow label="When to notify" fullWidth>
            <EuiRadioGroup
              options={[
                {
                  id: 'status-change',
                  label: 'On status change — notify when an alert is created, recovers, or escalates.',
                },
                {
                  id: 'throttle',
                  label: 'On status change with throttle — suppress repeats within a window.',
                },
              ]}
              idSelected="throttle"
              onChange={() => {}}
            />
          </EuiFormRow>

          <EuiSpacer size="s" />

          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">Throttle for</EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFieldNumber value={15} style={{ width: 60 }} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiSelect
                options={[
                  { value: 'm', text: 'minutes' },
                  { value: 'h', text: 'hours' },
                ]}
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          <EuiCallOut
            title="Need more control?"
            size="s"
            iconType="questionInCircle"
          >
            <p>
              You can add matchers, group-by fields, or extra triggers after creating the rule.
            </p>
          </EuiCallOut>
        </>
      )}
    </>
  );
}

// ── Main form component ───────────────────────────────────────────────────────

function buildYaml(state: ComposeDiscoverState): string {
  const base = state.baseQuery || '';
  const alertBlock = state.alertBlock || '';
  const recoveryBlock = state.recoveryBlock || '';
  const fullQuery = state.fullQuery || '';
  const indent = (s: string) => s.split('\n').join('\n      ');

  const querySection = state.tracking
    ? `  query:\n    base: |\n      ${indent(base)}\n    alert_block: |\n      ${alertBlock}\n    recovery_block: |\n      ${recoveryBlock}`
    : `  query:\n    base: |\n      ${indent(fullQuery)}`;

  return `kind: alert
metadata:
  name: "${state.name}"
  tags: [${state.tags.map((t) => `"${t}"`).join(', ')}]
  description: ""
evaluation:
${querySection}
  trigger:
    condition: "${alertBlock.replace('| WHERE ', '').replace('|WHERE ', '')}"
grouping:
  fields: [${state.groupFields.map((f) => `"${f}"`).join(', ')}]
timeField: "${state.timeField}"
schedule:
  every: "${state.schedule}"
  lookback: "${state.lookback}"
recovery_policy:
  type: "${state.recoveryType}"
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

  const stepTitles = getStepTitles(state);
  const currentStepName = stepTitles[state.step] ?? '';

  if (currentStepName === 'Alert Condition') {
    return <AlertConditionStep state={state} dispatch={dispatch} isOpt2={false} services={services} />;
  }

  if (currentStepName === 'Query Condition') {
    return <AlertConditionStep state={state} dispatch={dispatch} isOpt2={true} services={services} />;
  }

  if (currentStepName === 'Recovery Condition') {
    return <RecoveryConditionStep state={state} dispatch={dispatch} />;
  }

  if (currentStepName === 'Details & Artifacts') {
    return <DetailsAndArtifactsStep state={state} dispatch={dispatch} />;
  }

  if (currentStepName === 'Notifications') {
    return <NotificationsStep state={state} dispatch={dispatch} />;
  }

  return null;
};
