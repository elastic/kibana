/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  ConditionalSnoozeSchedule,
  DataConditionEntry,
  DataConditionTypeDescriptor,
  SnoozeCondition,
} from './types';
import { validateDuration, computeEndDate } from '../utils/duration_validation';
import {
  buildTimeChipLabel,
  buildPreviewSentences,
  buildConditionalSnoozeSchedule,
} from '../utils/conditional_snooze_schedule';
import { TimeConditionPanel } from './time_condition_panel';
import type { TimeConditionState } from './time_condition_panel';
import { DataConditionPanel } from './data_condition_panel';
import { buildDataConditionTypes } from './built_in_data_conditions';
import * as i18n from './translations';

export type { ConditionalSnoozeSchedule, SnoozeCondition };
export type { TimeConditionState } from './time_condition_panel';

export interface ConditionalSnoozePanelProps {
  /**
   * Called with the current snooze schedule whenever the conditions change.
   * `undefined` means no valid conditions are confirmed (button should be disabled).
   */
  onScheduleChange: (schedule: ConditionalSnoozeSchedule | undefined) => void;
  /**
   * Leaf-level scalar alert field names offered in the `field_change` condition's
   * field dropdown. Consumers fetch these and pass them down; the package itself
   * stays data-agnostic.
   */
  fieldOptions?: string[];
  /** Whether the alert field names are still being fetched by the consumer. */
  isLoadingFields?: boolean;
}

const newEntry = (
  id: string,
  descriptors: readonly DataConditionTypeDescriptor[]
): DataConditionEntry => ({
  id,
  type: descriptors[0]?.id ?? '',
  field: '',
  value: 'critical',
  confirmed: false,
});

export const ConditionalSnoozePanel = ({
  onScheduleChange,
  fieldOptions,
  isLoadingFields = false,
}: ConditionalSnoozePanelProps) => {
  const { euiTheme } = useEuiTheme();

  const dataConditionTypes = useMemo(
    () => buildDataConditionTypes({ fields: fieldOptions, isLoading: isLoadingFields }),
    [fieldOptions, isLoadingFields]
  );
  const logicalOperatorCss = useMemo(
    () =>
      css({
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: 999,
        minWidth: 'unset',
      }),
    [euiTheme]
  );

  const descriptorById = useMemo(
    () => new Map(dataConditionTypes.map((d) => [d.id, d])),
    [dataConditionTypes]
  );

  const idCounterRef = useRef(0);
  const [timeCondition, setTimeCondition] = useState<TimeConditionState | null>(null);
  const [dataConditions, setDataConditions] = useState<DataConditionEntry[]>([]);
  const [conditionOperator, setConditionOperator] = useState<'any' | 'all'>('any');

  const isConfirmed = timeCondition?.status === 'confirmed';
  const {
    isDurationInvalid: isTimeDurationInvalid,
    isPastDateTime,
    isDateTimeMissing,
  } = validateDuration(timeCondition);
  const isTimeConditionInvalid = isTimeDurationInvalid || isPastDateTime || isDateTimeMissing;

  const confirmedDataConditions = dataConditions.filter((condition) => condition.confirmed);

  const isSnoozeDisabled =
    isTimeConditionInvalid || (!isConfirmed && confirmedDataConditions.length === 0);

  const timeEndDate = useMemo(
    () => (isTimeConditionInvalid ? null : computeEndDate(timeCondition)),
    [isTimeConditionInvalid, timeCondition]
  );

  const timeChipLabel = buildTimeChipLabel(timeCondition);

  const usedDescriptorIds = new Set(dataConditions.map((c) => c.type));
  const disabledDataConditionTypes: readonly string[] = dataConditionTypes
    .filter((d) => d.isSingleton && usedDescriptorIds.has(d.id))
    .map((d) => d.id);

  const descriptorWarning = ((): string | null => {
    const context = {
      allEntries: dataConditions,
      confirmedEntries: confirmedDataConditions,
      conditionOperator,
    };
    for (const descriptor of dataConditionTypes) {
      const warning = descriptor.getWarning?.(context);
      if (warning) return warning;
    }
    return null;
  })();

  const previewSentences = buildPreviewSentences({
    confirmedDataConditions,
    descriptorById,
    conditionOperator,
    timeEndDate: isConfirmed ? timeEndDate : null,
  });

  const addDataCondition = useCallback(() => {
    setDataConditions((prev) => [
      ...prev,
      newEntry(`dc-${++idCounterRef.current}`, dataConditionTypes),
    ]);
  }, [dataConditionTypes]);

  const handleDataConditionChange = useCallback(
    (id: string, newEntryDetails: DataConditionEntry | null) => {
      setDataConditions((prev) =>
        newEntryDetails === null
          ? prev.filter((c) => c.id !== id)
          : prev.map((c) => (c.id === id ? newEntryDetails : c))
      );
    },
    []
  );

  const toggleLogicalOperator = useCallback(() => {
    setConditionOperator((prev) => (prev === 'any' ? 'all' : 'any'));
  }, []);

  const snoozeSchedule = useMemo<ConditionalSnoozeSchedule | undefined>(() => {
    if (isSnoozeDisabled) return undefined;
    return buildConditionalSnoozeSchedule({
      hasConfirmedTimeCondition: isConfirmed,
      timeEndDate,
      dataConditions,
      descriptorById,
      conditionOperator,
    });
  }, [
    isSnoozeDisabled,
    isConfirmed,
    timeEndDate,
    dataConditions,
    conditionOperator,
    descriptorById,
  ]);

  useEffect(() => {
    onScheduleChange(snoozeSchedule);
  }, [snoozeSchedule, onScheduleChange]);

  return (
    <>
      <EuiText size="s">
        <p>{i18n.CONDITIONS_HEADER}</p>
      </EuiText>
      <EuiSpacer size="s" />

      <TimeConditionPanel
        value={timeCondition}
        chipLabel={timeChipLabel}
        isConditionInvalid={isTimeConditionInvalid}
        isDurationInvalid={isTimeDurationInvalid}
        isDateTimeInvalid={isPastDateTime}
        onChange={setTimeCondition}
      />

      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.LOGICAL_SEPARATOR('or')}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiHorizontalRule margin="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      {dataConditions.map((entry, index) => (
        <React.Fragment key={entry.id}>
          {index > 0 && (
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              style={{ margin: '8px 0' }}
            >
              <EuiFlexItem style={{ alignSelf: 'center' }}>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                {index === 1 ? (
                  <EuiButtonEmpty
                    size="xs"
                    color="text"
                    css={logicalOperatorCss}
                    onClick={toggleLogicalOperator}
                    data-test-subj="logicalOperator"
                  >
                    {i18n.LOGICAL_SEPARATOR(conditionOperator)}
                  </EuiButtonEmpty>
                ) : (
                  <EuiText size="xs" color="subdued" style={{ padding: '0 8px' }}>
                    {i18n.LOGICAL_SEPARATOR(conditionOperator)}
                  </EuiText>
                )}
              </EuiFlexItem>
              <EuiFlexItem style={{ alignSelf: 'center' }}>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          <DataConditionPanel
            entry={entry}
            onChange={(newEntryDetails) => handleDataConditionChange(entry.id, newEntryDetails)}
            descriptors={dataConditionTypes}
            disabledTypes={disabledDataConditionTypes}
          />
        </React.Fragment>
      ))}

      <EuiSpacer size="s" />
      <EuiButton
        iconType="database"
        size="s"
        color="text"
        onClick={addDataCondition}
        data-test-subj="addDataCondition"
      >
        {i18n.ADD_DATA_CONDITION}
      </EuiButton>

      <EuiHorizontalRule margin="m" />

      {descriptorWarning && (
        <>
          <EuiCallOut
            announceOnMount
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="conflictingSeverityEqualsWarning"
            title={descriptorWarning}
          />
          <EuiSpacer size="s" />
        </>
      )}

      <EuiText size="s" color="subdued" data-test-subj="conditionsPreviewText">
        {previewSentences.map((sentence, i) => (
          <p key={i}>{sentence}</p>
        ))}
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};
