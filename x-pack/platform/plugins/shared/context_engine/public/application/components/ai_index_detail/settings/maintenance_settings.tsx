/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import {
  MAX_MAINTENANCE_NEIGHBORS,
  MAX_MAINTENANCE_SWEEP_SIZE,
  type MaintenanceMode,
  type ResolvedMaintenanceConfig,
} from '../../../../../common/dreaming';
import { validateDreamingInterval } from '../../../../../common/validation';

type MaintenanceField =
  | 'interval'
  | 'neighbors'
  | 'sweep_size'
  | 'max_stale_removals_percent'
  | 'max_model_removals_percent';

const wholeNumberError = (min: number, max: number) =>
  i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.maintenance.wholeNumberError', {
    defaultMessage: 'Must be a whole number from {min} to {max}.',
    values: { min, max },
  });

const inRange = (value: number, min: number, max: number): boolean =>
  Number.isInteger(value) && value >= min && value <= max;

const fieldValue = (value: number): number | '' => (Number.isNaN(value) ? '' : value);

/** What is wrong with each maintenance setting. Nothing is checked while maintenance is off. */
export const maintenanceErrorsOf = ({
  enabled,
  schedule,
  neighbors,
  sweep_size: sweepSize,
  max_stale_removals_percent: maxStaleRemovalsPercent,
  max_model_removals_percent: maxModelRemovalsPercent,
}: ResolvedMaintenanceConfig): Partial<Record<MaintenanceField, string>> => {
  if (!enabled) {
    return {};
  }
  const interval = validateDreamingInterval(schedule.interval.trim());
  return {
    ...(interval !== undefined && { interval }),
    ...(!inRange(neighbors, 1, MAX_MAINTENANCE_NEIGHBORS) && {
      neighbors: wholeNumberError(1, MAX_MAINTENANCE_NEIGHBORS),
    }),
    ...(!inRange(sweepSize, 1, MAX_MAINTENANCE_SWEEP_SIZE) && {
      sweep_size: wholeNumberError(1, MAX_MAINTENANCE_SWEEP_SIZE),
    }),
    ...(!inRange(maxStaleRemovalsPercent, 1, 100) && {
      max_stale_removals_percent: wholeNumberError(1, 100),
    }),
    ...(!inRange(maxModelRemovalsPercent, 1, 100) && {
      max_model_removals_percent: wholeNumberError(1, 100),
    }),
  };
};

const MODE_OPTIONS: Array<{ value: MaintenanceMode; text: string }> = [
  {
    value: 'report',
    text: i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.maintenance.modeReport', {
      defaultMessage: 'Report the changes only',
    }),
  },
  {
    value: 'apply',
    text: i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.maintenance.modeApply', {
      defaultMessage: 'Make the changes',
    }),
  },
];

interface MaintenanceSettingsProps {
  maintenance: ResolvedMaintenanceConfig;
  onChange: (maintenance: ResolvedMaintenanceConfig) => void;
}

/** Whether, how and how often maintenance tidies the AI index's memory. */
export const MaintenanceSettings = ({ maintenance, onChange }: MaintenanceSettingsProps) => {
  const advancedId = useGeneratedHtmlId({ prefix: 'contextAiIndexMaintenanceAdvanced' });
  const errors = maintenanceErrorsOf(maintenance);
  const update = (changes: Partial<ResolvedMaintenanceConfig>) =>
    onChange({ ...maintenance, ...changes });

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.dreaming.maintenance.title"
            defaultMessage="Maintenance"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFormRow
        helpText={i18n.translate('xpack.contextEngine.aiIndexDetail.dreaming.maintenance.help', {
          defaultMessage:
            'Merges duplicates, settles contradictions and removes items whose memories are gone. Items a person edited are never changed.',
        })}
      >
        <EuiSwitch
          label={i18n.translate(
            'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.enabledLabel',
            { defaultMessage: 'Maintain on a schedule' }
          )}
          checked={maintenance.enabled}
          onChange={(event) => update({ enabled: event.target.checked })}
          data-test-subj="contextAiIndexMaintenanceEnabled"
        />
      </EuiFormRow>
      {maintenance.enabled && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="l" responsive={false} wrap>
            <EuiFlexItem grow={false} css={{ minWidth: 240 }}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.modeLabel',
                  { defaultMessage: 'Mode' }
                )}
              >
                <EuiSelect
                  options={MODE_OPTIONS}
                  value={maintenance.mode}
                  onChange={(event) => update({ mode: event.target.value as MaintenanceMode })}
                  data-test-subj="contextAiIndexMaintenanceMode"
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ minWidth: 200 }}>
              <EuiFormRow
                label={i18n.translate(
                  'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.intervalLabel',
                  { defaultMessage: 'Every' }
                )}
                isInvalid={errors.interval !== undefined}
                error={errors.interval}
              >
                <EuiFieldText
                  value={maintenance.schedule.interval}
                  isInvalid={errors.interval !== undefined}
                  onChange={(event) => update({ schedule: { interval: event.target.value } })}
                  data-test-subj="contextAiIndexMaintenanceInterval"
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <EuiAccordion
            id={advancedId}
            buttonContent={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.advanced',
              { defaultMessage: 'Advanced settings' }
            )}
            data-test-subj="contextAiIndexMaintenanceAdvanced"
          >
            <EuiSpacer size="m" />
            <EuiFlexGroup gutterSize="l" responsive={false} wrap>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.neighborsLabel',
                    { defaultMessage: 'Similar items to compare' }
                  )}
                  isInvalid={errors.neighbors !== undefined}
                  error={errors.neighbors}
                >
                  <EuiFieldNumber
                    min={1}
                    max={MAX_MAINTENANCE_NEIGHBORS}
                    value={fieldValue(maintenance.neighbors)}
                    isInvalid={errors.neighbors !== undefined}
                    onChange={(event) => update({ neighbors: event.target.valueAsNumber })}
                    data-test-subj="contextAiIndexMaintenanceNeighbors"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.sweepSizeLabel',
                    { defaultMessage: 'Unchanged items to review each run' }
                  )}
                  isInvalid={errors.sweep_size !== undefined}
                  error={errors.sweep_size}
                >
                  <EuiFieldNumber
                    min={1}
                    max={MAX_MAINTENANCE_SWEEP_SIZE}
                    value={fieldValue(maintenance.sweep_size)}
                    isInvalid={errors.sweep_size !== undefined}
                    onChange={(event) => update({ sweep_size: event.target.valueAsNumber })}
                    data-test-subj="contextAiIndexMaintenanceSweepSize"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.maxStaleRemovalsLabel',
                    { defaultMessage: 'Stale items one run may remove (%)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.maxStaleRemovalsHelp',
                    {
                      defaultMessage:
                        'Of all facts and entities. Items whose memories are all gone; the rest wait for later runs.',
                    }
                  )}
                  isInvalid={errors.max_stale_removals_percent !== undefined}
                  error={errors.max_stale_removals_percent}
                >
                  <EuiFieldNumber
                    min={1}
                    max={100}
                    value={fieldValue(maintenance.max_stale_removals_percent)}
                    isInvalid={errors.max_stale_removals_percent !== undefined}
                    onChange={(event) =>
                      update({ max_stale_removals_percent: event.target.valueAsNumber })
                    }
                    data-test-subj="contextAiIndexMaintenanceMaxStaleRemovals"
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.maxModelRemovalsLabel',
                    { defaultMessage: 'Duplicates and conflicts one run may remove (%)' }
                  )}
                  helpText={i18n.translate(
                    'xpack.contextEngine.aiIndexDetail.dreaming.maintenance.maxModelRemovalsHelp',
                    {
                      defaultMessage:
                        'Of the items reviewed. Over it, the run makes none of the model’s changes.',
                    }
                  )}
                  isInvalid={errors.max_model_removals_percent !== undefined}
                  error={errors.max_model_removals_percent}
                >
                  <EuiFieldNumber
                    min={1}
                    max={100}
                    value={fieldValue(maintenance.max_model_removals_percent)}
                    isInvalid={errors.max_model_removals_percent !== undefined}
                    onChange={(event) =>
                      update({ max_model_removals_percent: event.target.valueAsNumber })
                    }
                    data-test-subj="contextAiIndexMaintenanceMaxModelRemovals"
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiAccordion>
        </>
      )}
    </>
  );
};
