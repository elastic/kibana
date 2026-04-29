/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import moment from 'moment';
import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { DataConditionType, type ConditionalSnoozeSchedule, type SnoozeCondition } from './types';
import { SNOOZE_DATE_DISPLAY_FORMAT, SNOOZE_UNIT_OPTIONS } from './constants';
import { validateDuration, computeEndDate } from '../utils/duration_validation';
import { TimeConditionPanel } from './time_condition_panel';
import type { TimeConditionState } from './time_condition_panel';
import { DataConditionPanel } from './data_condition_panel';
import type { DataConditionEntry } from './data_condition_panel';
import * as i18n from './translations';

export type { ConditionalSnoozeSchedule, SnoozeCondition };
export type { SelectOption } from './data_condition_panel';
export type { TimeConditionState } from './time_condition_panel';

export interface ConditionalSnoozePanelProps {
  /**
   * Called with the current snooze schedule whenever the conditions change.
   * `undefined` means no valid conditions are confirmed (button should be disabled).
   */
  onScheduleChange: (schedule: ConditionalSnoozeSchedule | undefined) => void;
}

const newEntry = (id: string): DataConditionEntry => ({
  id,
  type: DataConditionType.FIELD_CHANGE,
  field: '',
  value: 'critical',
  confirmed: false,
});

const toSnoozeCondition = ({ type, field, value }: DataConditionEntry): SnoozeCondition => {
  if (type === DataConditionType.SEVERITY_CHANGE)
    return { type: DataConditionType.SEVERITY_CHANGE };
  if (type === DataConditionType.SEVERITY_EQUALS)
    return { type: DataConditionType.SEVERITY_EQUALS, value };
  return { type: DataConditionType.FIELD_CHANGE, field };
};

export const ConditionalSnoozePanel = ({ onScheduleChange }: ConditionalSnoozePanelProps) => {
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

  const confirmedDataConditions = useMemo(
    () => dataConditions.filter((condition) => condition.confirmed),
    [dataConditions]
  );

  const isSnoozeDisabled = !isConfirmed && confirmedDataConditions.length === 0;

  const timeEndDate = useMemo<string | null>(() => {
    if (isTimeConditionInvalid) return null;
    return computeEndDate(timeCondition);
  }, [isTimeConditionInvalid, timeCondition]);

  const timeChipLabel = useMemo<string>(() => {
    if (!timeCondition) return '';
    if (timeCondition.mode === 'datetime') {
      return timeCondition.dateTime?.format(SNOOZE_DATE_DISPLAY_FORMAT) ?? '';
    }
    const unitText = (
      SNOOZE_UNIT_OPTIONS.find((o) => o.value === timeCondition.unit)?.text ?? timeCondition.unit
    ).toLowerCase();
    return i18n.getAfterDurationLabel(timeCondition.value, unitText);
  }, [timeCondition]);

  const disabledDataConditionTypes = useMemo<readonly DataConditionType[]>(() => {
    const hasSeverityChange = dataConditions.some(
      (c) => c.type === DataConditionType.SEVERITY_CHANGE
    );
    return hasSeverityChange ? [DataConditionType.SEVERITY_CHANGE] : [];
  }, [dataConditions]);

  const hasConflictingSeverityEquals = useMemo(() => {
    if (conditionOperator !== 'all') return false;
    const severityEqualsValues = confirmedDataConditions
      .filter((c) => c.type === DataConditionType.SEVERITY_EQUALS)
      .map((c) => c.value);
    return new Set(severityEqualsValues).size > 1;
  }, [confirmedDataConditions, conditionOperator]);

  const previewSentences = useMemo<string[]>(() => {
    const formattedTimeDate =
      isConfirmed && timeEndDate ? moment(timeEndDate).format(SNOOZE_DATE_DISPLAY_FORMAT) : null;

    const dataConnector =
      conditionOperator === 'all' ? i18n.PREVIEW_CONNECTOR_AND : i18n.PREVIEW_CONNECTOR_OR;

    const dataPreviewPart =
      confirmedDataConditions.length > 0
        ? confirmedDataConditions
            .map((c) => {
              if (c.type === DataConditionType.SEVERITY_CHANGE) return i18n.PREVIEW_SEVERITY_CHANGE;
              if (c.type === DataConditionType.SEVERITY_EQUALS)
                return i18n.getPreviewSeverityEquals(c.value);
              return i18n.getPreviewFieldChange(c.field);
            })
            .reduce((acc, part) => `${acc} ${dataConnector} ${part}`)
        : null;

    if (!formattedTimeDate && !dataPreviewPart) {
      return [i18n.CONDITIONS_FOOTER_HINT];
    }

    if (formattedTimeDate && !dataPreviewPart) {
      return [i18n.getUnsnoozeOnDateMessage(formattedTimeDate)];
    }

    if (dataPreviewPart && !formattedTimeDate) {
      return [i18n.getUnsnoozeIfConditionsMessage(dataPreviewPart)];
    }

    return [
      i18n.getUnsnoozeIfConditionsMessage(dataPreviewPart as string),
      i18n.getUnsnoozeAlsoAfterMessage(formattedTimeDate as string),
    ];
  }, [isConfirmed, timeEndDate, confirmedDataConditions, conditionOperator]);

  const addDataCondition = useCallback(() => {
    setDataConditions((prev) => [...prev, newEntry(`dc-${++idCounterRef.current}`)]);
  }, []);

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

    const schedule: ConditionalSnoozeSchedule = {};

    if (isConfirmed && timeEndDate) {
      schedule.expiresAt = timeEndDate;
    }

    if (confirmedDataConditions.length > 0) {
      schedule.conditions = confirmedDataConditions.map(toSnoozeCondition);
      schedule.conditionOperator = conditionOperator;
    }

    return schedule;
  }, [isSnoozeDisabled, isConfirmed, timeEndDate, confirmedDataConditions, conditionOperator]);

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
                  <EuiButton
                    size="s"
                    color="text"
                    style={{ borderRadius: '999px', minWidth: 'unset' }}
                    onClick={toggleLogicalOperator}
                    data-test-subj="logicalOperator"
                  >
                    {i18n.LOGICAL_SEPARATOR(conditionOperator)}
                  </EuiButton>
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

      {hasConflictingSeverityEquals && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            data-test-subj="conflictingSeverityEqualsWarning"
            title={i18n.CONFLICTING_SEVERITY_EQUALS_WARNING}
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
