/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
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
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { ComposeDiscoverState, ComposeDiscoverAction, DelayMode } from './types';
import { QuerySummary } from './query_summary';
import { splitQuery, guessRecoveryBlock } from './use_heuristic_split';

interface ComposeDiscoverFormProps {
  state: ComposeDiscoverState;
  dispatch: React.Dispatch<ComposeDiscoverAction>;
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

const RECOVERY_OPTIONS = [
  { id: 'default', label: 'Default — no longer in alert results' },
  { id: 'custom', label: 'Custom recovery condition' },
];

function parseDurationParts(dur: string): { value: number; unit: string } {
  const match = dur.match(/^(\d+)([smhd])$/);
  return match ? { value: parseInt(match[1], 10), unit: match[2] } : { value: 1, unit: 'm' };
}

export const ComposeDiscoverForm: React.FC<ComposeDiscoverFormProps> = ({ state, dispatch }) => {
  const scheduleParts = parseDurationParts(state.schedule);
  const lookbackParts = parseDurationParts(state.lookback);

  const handleTrackingToggle = useCallback(() => {
    if (state.tracking) {
      dispatch({ type: 'DISABLE_TRACKING' });
    } else {
      const currentQuery = state.fullQuery;
      const { base, alertBlock } = splitQuery(currentQuery);
      dispatch({ type: 'ENABLE_TRACKING', base, alertBlock });
    }
  }, [state.tracking, state.fullQuery, dispatch]);

  const handleRecoveryModeChange = useCallback(
    (id: string) => {
      const mode = id as 'default' | 'custom';
      dispatch({ type: 'SET_RECOVERY_MODE', mode });
      if (mode === 'custom' && !state.recoveryBlock && state.alertBlock) {
        dispatch({ type: 'SET_RECOVERY_BLOCK', block: guessRecoveryBlock(state.alertBlock) });
      }
    },
    [dispatch, state.recoveryBlock, state.alertBlock]
  );

  const activeQuery = state.tracking
    ? [state.baseQuery, state.alertBlock].filter(Boolean).join('\n')
    : state.fullQuery;

  const splitResult = state.tracking ? splitQuery(activeQuery) : null;
  const splitFailed = state.tracking && splitResult?.confidence === 'none' && !state.baseQuery;

  return (
    <>
      {/* Rule name */}
      <EuiFormRow label="Rule name" fullWidth>
        <EuiFieldText
          fullWidth
          value={state.name}
          onChange={(e) => dispatch({ type: 'SET_NAME', name: e.target.value })}
          placeholder="e.g. High CPU + memory hosts"
          data-test-subj="composeDiscoverRuleName"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* Tags */}
      <EuiFormRow label="Tags" fullWidth>
        <EuiComboBox
          fullWidth
          selectedOptions={state.tags.map((t) => ({ label: t }))}
          onChange={(opts) => dispatch({ type: 'SET_TAGS', tags: opts.map((o) => o.label) })}
          onCreateOption={(val) => dispatch({ type: 'SET_TAGS', tags: [...state.tags, val] })}
          placeholder="Add tags"
          data-test-subj="composeDiscoverRuleTags"
        />
      </EuiFormRow>

      <EuiHorizontalRule margin="m" />

      {/* Query section */}
      <EuiTitle size="xs">
        <h3>Query</h3>
      </EuiTitle>
      <EuiSpacer size="s" />

      {!state.tracking ? (
        <>
          <QuerySummary query={state.fullQuery} label="query" />
          <EuiSpacer size="s" />
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="editorCodeBlock"
                onClick={() => dispatch({ type: 'OPEN_CHILD' })}
                data-test-subj="composeDiscoverEditQuery"
              >
                Edit query
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
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
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="editorCodeBlock"
                onClick={() => dispatch({ type: 'OPEN_CHILD' })}
                data-test-subj="composeDiscoverEditQueries"
              >
                Edit queries
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiSpacer size="m" />

          {/* Recovery */}
          <EuiText size="xs" color="subdued">
            <strong>Recovery</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiRadioGroup
            options={RECOVERY_OPTIONS}
            idSelected={state.recoveryMode}
            onChange={handleRecoveryModeChange}
            data-test-subj="composeDiscoverRecoveryMode"
          />
          {state.recoveryMode === 'custom' && (
            <>
              <EuiSpacer size="s" />
              <QuerySummary query={state.recoveryBlock} label="recovery condition" />
            </>
          )}
        </>
      )}

      <EuiSpacer size="s" />

      {/* Tracking toggle */}
      <EuiSwitch
        label="Track active and recovered state over time"
        checked={state.tracking}
        onChange={handleTrackingToggle}
        data-test-subj="composeDiscoverTrackingToggle"
      />

      {state.tracking && (
        <>
          <EuiHorizontalRule margin="m" />

          {/* Alert delay */}
          <EuiFormRow label="Alert delay" fullWidth>
            <EuiButtonGroup
              legend="Alert delay mode"
              options={DELAY_MODE_OPTIONS}
              idSelected={state.alertDelayMode}
              onChange={(id) => dispatch({ type: 'SET_ALERT_DELAY_MODE', mode: id as DelayMode })}
              isFullWidth
              data-test-subj="composeDiscoverAlertDelay"
            />
          </EuiFormRow>
          {state.alertDelayMode !== 'immediate' && (
            <EuiFormRow
              label={state.alertDelayMode === 'breaches' ? 'Consecutive breaches' : 'Duration'}
              fullWidth
            >
              <EuiFieldNumber
                fullWidth
                min={1}
                value={state.alertDelayValue}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_ALERT_DELAY_VALUE',
                    value: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </EuiFormRow>
          )}

          <EuiSpacer size="m" />

          {/* Recovery delay */}
          <EuiFormRow label="Recovery delay" fullWidth>
            <EuiButtonGroup
              legend="Recovery delay mode"
              options={DELAY_MODE_OPTIONS}
              idSelected={state.recoveryDelayMode}
              onChange={(id) =>
                dispatch({ type: 'SET_RECOVERY_DELAY_MODE', mode: id as DelayMode })
              }
              isFullWidth
              data-test-subj="composeDiscoverRecoveryDelay"
            />
          </EuiFormRow>
          {state.recoveryDelayMode !== 'immediate' && (
            <EuiFormRow
              label={
                state.recoveryDelayMode === 'breaches' ? 'Consecutive recoveries' : 'Duration'
              }
              fullWidth
            >
              <EuiFieldNumber
                fullWidth
                min={1}
                value={state.recoveryDelayValue}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_RECOVERY_DELAY_VALUE',
                    value: parseInt(e.target.value, 10) || 1,
                  })
                }
              />
            </EuiFormRow>
          )}
        </>
      )}

      <EuiHorizontalRule margin="m" />

      {/* Evaluation */}
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
                  onChange={(e) => {
                    dispatch({
                      type: 'SET_SCHEDULE',
                      schedule: `${scheduleParts.value}${e.target.value}`,
                    });
                  }}
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
                  onChange={(e) => {
                    dispatch({
                      type: 'SET_LOOKBACK',
                      lookback: `${lookbackParts.value}${e.target.value}`,
                    });
                  }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFormRow label="Time field" fullWidth>
        <EuiFieldText
          fullWidth
          value={state.timeField}
          onChange={(e) => dispatch({ type: 'SET_TIME_FIELD', timeField: e.target.value })}
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

    </>
  );
};
