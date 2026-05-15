/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
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
import type {
  ComposeDiscoverState,
  ComposeDiscoverAction,
  RecoveryType,
  StepDefinition,
} from './types';
import { getStepIds } from './use_compose_discover_state';
import type { FormValues } from '../../form/types';
import { QuerySummary } from './query_summary';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useDataFields } from '../../form/hooks/use_data_fields';
import { splitQuery } from './use_heuristic_split';
import { RuleDetailsFieldGroup } from '../../form';
import { ScheduleField } from '../../form/fields/schedule_field';
import { LookbackWindowField } from '../../form/fields/lookback_window_field';
import { RecoveryDelayField } from '../../form/fields/recovery_delay_field';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
  services: RuleFormServices;
}

// ── Recovery type selector ────────────────────────────────────────────────────

const defaultRecoveryLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.defaultRecovery.dropDownOptionLabel',
  {
    defaultMessage: 'Default recovery',
  }
);

const defaultRecoveryDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.defaultRecovery.description',
  {
    defaultMessage: 'Recover automatically when the alert condition is no longer met.',
  }
);

const customRecoveryLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.customRecovery.dropDownOptionLabel',
  {
    defaultMessage: 'Custom recovery',
  }
);

const customRecoveryDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.customRecovery.description',
  {
    defaultMessage: 'Define a custom recovery condition.',
  }
);

const noRecoveryLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.noRecovery.dropDownOptionLabel',
  {
    defaultMessage: 'No recovery',
  }
);

const noRecoveryDescription = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.noRecovery.description',
  {
    defaultMessage: 'Do not recover alerts automatically.',
  }
);

const noRecoveryComingSoonBadgeLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.composeDiscover.recoveryType.noRecovery.comingSoonBadgeLabel',
  {
    defaultMessage: 'Coming soon',
  }
);

const RECOVERY_TYPE_OPTIONS: Array<{
  value: RecoveryType;
  inputDisplay: string;
  dropdownDisplay: React.ReactNode;
  disabled?: boolean;
}> = [
  {
    value: 'default',
    inputDisplay: defaultRecoveryLabel,
    dropdownDisplay: (
      <>
        <strong>{defaultRecoveryLabel}</strong>
        <EuiText size="s" color="subdued">
          <p>{defaultRecoveryDescription}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'custom',
    inputDisplay: customRecoveryLabel,
    dropdownDisplay: (
      <>
        <strong>{customRecoveryLabel}</strong>
        <EuiText size="s" color="subdued">
          <p>{customRecoveryDescription}</p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'none',
    disabled: true,
    inputDisplay: noRecoveryLabel,
    dropdownDisplay: (
      <>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap={false}>
          <EuiFlexItem grow={false}>
            <strong>{noRecoveryLabel}</strong>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{noRecoveryComingSoonBadgeLabel}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="s" color="subdued">
          <p>{noRecoveryDescription}</p>
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
  const { clearErrors, control, setValue, watch } = useFormContext<FormValues>();
  const grouping = watch('grouping');
  const groupFields = grouping?.fields ?? [];

  // RHF is the source of truth for the evaluation query. Both field
  // detection and output-column fetching derive from it, gated on
  // queryCommitted so we don't fire requests before the user applies.
  const evalQuery = watch('evaluation.query.base') ?? '';
  const committedQuery = useMemo(() => {
    return /^\s*FROM\s+[a-zA-Z0-9_.*-]/i.test(evalQuery) && state.queryCommitted ? evalQuery : '';
  }, [evalQuery, state.queryCommitted]);

  // useDataFields resolves raw index fields via getESQLAdHocDataview,
  // so the full pipeline (including STATS) is safe — only the FROM
  // clause matters for field discovery.
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
    if (dateFields.length === 0) {
      return [{ value: '@timestamp', text: '@timestamp' }];
    }
    const opts = dateFields.map((name) => ({ value: name, text: name }));
    if (dateFields.length > 1) {
      opts.unshift({ value: '', text: 'Select a time field…' });
    }
    return opts;
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
      <Controller
        name="timeField"
        control={control}
        rules={{
          validate: (value) => {
            if (!value) {
              return i18n.translate(
                'xpack.responseOps.alertingV2RuleForm.composeDiscover.timeFieldRequiredError',
                { defaultMessage: 'Time field is required.' }
              );
            }
            return true;
          },
        }}
        render={({ field: { ref, value, onChange }, fieldState: { error } }) => (
          <EuiFormRow label="Time field" fullWidth isInvalid={!!error} error={error?.message}>
            <EuiSelect
              inputRef={ref}
              fullWidth
              options={timeFieldOptions}
              value={value ?? ''}
              onChange={(e) => {
                onChange(e.target.value);
                if (e.target.value) clearErrors('timeField');
              }}
              disabled={state.childOpen}
              isInvalid={!!error}
              data-test-subj="composeDiscoverTimeField"
            />
          </EuiFormRow>
        )}
      />
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

      <EuiSpacer size="m" />
      <RecoveryDelayField />
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

// ── Step definitions ──────────────────────────────────────────────────────────

const STEP_REGISTRY: Record<StepDefinition['id'], StepDefinition> = {
  alertCondition: {
    id: 'alertCondition',
    title: 'Alert Condition',
    render: (props) => <AlertConditionStep {...props} />,
    validate: async (_methods, s) => s.queryCommitted && (await _methods.trigger('timeField')),
  },
  recoveryCondition: {
    id: 'recoveryCondition',
    title: 'Recovery Condition',
    render: (props) => <RecoveryConditionStep state={props.state} dispatch={props.dispatch} />,
  },
  details: {
    id: 'details',
    title: 'Details & Artifacts',
    render: () => <DetailsAndArtifactsStep />,
    validate: async (methods) => methods.trigger(['metadata.name']),
  },
  notifications: {
    id: 'notifications',
    title: 'Notifications',
    render: () => <NotificationsStep />,
  },
};

export const getSteps = (tracking: boolean): StepDefinition[] =>
  getStepIds(tracking).map((id) => STEP_REGISTRY[id]);

// ── Main form component ───────────────────────────────────────────────────────

export const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps> = ({
  state,
  dispatch,
  services,
}) => {
  const steps = getSteps(state.tracking);
  return steps[state.step].render({ state, dispatch, services });
};
