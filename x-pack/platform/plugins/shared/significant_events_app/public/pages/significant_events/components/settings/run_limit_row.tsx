/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  MAX_RUN_LIMIT,
  MIN_RUN_LIMIT,
  type ControlledRunBudgetGroupId,
  type RunBudgetGroupUsage,
} from '@kbn/significant-events-plugin/common';
import { toDraftFromInput, toRunLimit, type RunLimitDraft } from './run_limit_draft';

interface LimitInputProps {
  group: ControlledRunBudgetGroupId;
  draft: RunLimitDraft;
  disabled: boolean;
  onChange: (draft: RunLimitDraft) => void;
}

export const LimitInput = ({ group, draft, disabled, onChange }: LimitInputProps) => {
  const invalid = toRunLimit(draft) === undefined;
  return (
    <EuiFormRow
      label={i18n.translate('xpack.significantEventsApp.settings.runLimits.dailyLimitInputLabel', {
        defaultMessage: 'Daily limit',
      })}
      helpText={i18n.translate(
        'xpack.significantEventsApp.settings.runLimits.unlimitedInputDescription',
        {
          defaultMessage: 'Set 0 for unlimited.',
        }
      )}
      isInvalid={invalid}
      error={
        invalid
          ? i18n.translate(
              'xpack.significantEventsApp.settings.runLimits.invalidLimitErrorMessage',
              {
                defaultMessage: 'Enter 0 or a whole number from {minimum} to {maximum}.',
                values: { minimum: MIN_RUN_LIMIT, maximum: MAX_RUN_LIMIT },
              }
            )
          : undefined
      }
    >
      <EuiFieldNumber
        data-test-subj={`significantEventsRunLimitInput-${group}`}
        value={draft.max}
        min={0}
        max={MAX_RUN_LIMIT}
        step={1}
        isInvalid={invalid}
        disabled={disabled}
        onChange={(event) => onChange(toDraftFromInput(event.target.value))}
      />
    </EuiFormRow>
  );
};

export const UsageNumbers = ({ usage }: { usage: RunBudgetGroupUsage }) => (
  <>
    <EuiText size="s">
      <p data-test-subj={`significantEventsRunLimitUsage-${usage.group}`}>
        {i18n.translate('xpack.significantEventsApp.settings.runLimits.usageDescription', {
          defaultMessage:
            '{runs, plural, one {# run today} other {# runs today}} · {counted, plural, one {# counted} other {# counted}}',
          values: { runs: usage.used, counted: usage.counted },
        })}
      </p>
    </EuiText>
    {usage.group === 'investigation' && (
      <EuiText size="xs" color="subdued">
        <p data-test-subj="significantEventsRunLimitInvestigationSplit">
          {i18n.translate(
            'xpack.significantEventsApp.settings.runLimits.investigationGrantSplitDescription',
            {
              defaultMessage:
                '{regular, plural, one {# regular grant} other {# regular grants}} · {critical, plural, one {# critical override} other {# critical overrides}}',
              values: {
                regular: usage.withinLimitGrantCount,
                critical: usage.criticalPastLimitGrantCount,
              },
            }
          )}
        </p>
      </EuiText>
    )}
  </>
);

interface RunLimitRowProps {
  group: ControlledRunBudgetGroupId;
  usage: RunBudgetGroupUsage;
  draft: RunLimitDraft;
  disabled: boolean;
  groupLabel: string;
  groupWorkLabel: string;
  onChange: (draft: RunLimitDraft) => void;
  onReview: () => void;
}

export const RunLimitRow = ({
  group,
  usage,
  draft,
  disabled,
  groupLabel,
  groupWorkLabel,
  onChange,
  onReview,
}: RunLimitRowProps) => {
  const reached = usage.limit.enabled && usage.counted >= usage.limit.max;
  const hasEarlierInvestigationDenials =
    group === 'investigation' && usage.totalSkipped > 0 && !reached;

  return (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>{groupLabel}</h4>
        </EuiTitle>
        <UsageNumbers usage={usage} />
        {reached && (
          <EuiText size="xs" color="warning">
            <p>
              {group === 'investigation'
                ? i18n.translate(
                    'xpack.significantEventsApp.settings.runLimits.investigationReachedDescription',
                    {
                      defaultMessage:
                        'Limit reached: {count, plural, one {# gate denial} other {# gate denials}} today.',
                      values: { count: usage.totalSkipped },
                    }
                  )
                : i18n.translate(
                    'xpack.significantEventsApp.settings.runLimits.workerReachedDescription',
                    {
                      defaultMessage:
                        'Limit reached. New {work} is denied until the counter resets.',
                      values: { work: groupWorkLabel },
                    }
                  )}{' '}
              {group === 'investigation' && (
                <EuiLink onClick={onReview}>
                  {i18n.translate('xpack.significantEventsApp.settings.runLimits.reviewLinkText', {
                    defaultMessage: 'Review',
                  })}
                </EuiLink>
              )}
            </p>
          </EuiText>
        )}
        {hasEarlierInvestigationDenials && (
          <EuiText size="xs" color="subdued">
            <p>
              {i18n.translate(
                'xpack.significantEventsApp.settings.runLimits.earlierInvestigationDenialsDescription',
                {
                  defaultMessage:
                    'Earlier today, the gate denied {count, plural, one {# investigation request} other {# investigation requests}}.',
                  values: { count: usage.totalSkipped },
                }
              )}{' '}
              <EuiLink onClick={onReview}>
                {i18n.translate('xpack.significantEventsApp.settings.runLimits.reviewLinkText', {
                  defaultMessage: 'Review',
                })}
              </EuiLink>
            </p>
          </EuiText>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LimitInput group={group} draft={draft} disabled={disabled} onChange={onChange} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const MemoryRunLimitRow = ({
  usage,
  groupLabel,
}: {
  usage: RunBudgetGroupUsage;
  groupLabel: string;
}) => (
  <div>
    <EuiTitle size="xs">
      <h4>{groupLabel}</h4>
    </EuiTitle>
    <EuiText size="s">
      <p>
        {i18n.translate('xpack.significantEventsApp.settings.runLimits.memoryUsageDescription', {
          defaultMessage: '{runs, plural, one {# run today} other {# runs today}}',
          values: { runs: usage.used },
        })}
      </p>
    </EuiText>
    <EuiText size="xs" color="subdued">
      <p>
        {i18n.translate('xpack.significantEventsApp.settings.runLimits.memoryUncappedDescription', {
          defaultMessage:
            'No limit: memory automation is not capped because the same workflows power scheduled and manual updates.',
        })}
      </p>
    </EuiText>
  </div>
);
