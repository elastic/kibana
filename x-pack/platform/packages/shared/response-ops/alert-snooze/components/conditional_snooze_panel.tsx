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
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { ConditionalSnoozeSchedule, SnoozeCondition } from './types';
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
  fieldOptions?: Array<{ value: string; text: string }>;
}

const newEntry = (id: string): DataConditionEntry => ({
  id,
  field: '',
  operator: 'is',
  value: '',
  confirmed: false,
  logicalOperator: 'and',
});

const toSnoozeCondition = ({ field, operator, value }: DataConditionEntry): SnoozeCondition => ({
  type: 'field_equals',
  field,
  value,
  negate: operator === 'is_not',
});

export const ConditionalSnoozePanel = ({
  onScheduleChange,
  fieldOptions = [],
}: ConditionalSnoozePanelProps) => {
  const idCounterRef = useRef(0);

  const [timeCondition, setTimeCondition] = useState<TimeConditionState | null>(null);
  const [dataConditions, setDataConditions] = useState<DataConditionEntry[]>([]);

  const isConfirmed = timeCondition?.status === 'confirmed';

  const {
    isDurationInvalid: isTimeDurationInvalid,
    isPastDateTime,
    isDateTimeMissing,
  } = validateDuration(timeCondition);
  const isTimeConditionInvalid = isTimeDurationInvalid || isPastDateTime || isDateTimeMissing;

  const confirmedDataConditions = useMemo(
    () =>
      dataConditions.filter(
        (condition) => condition.confirmed && condition.field && condition.value
      ),
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

  const previewText = useMemo<string>(() => {
    const formattedTimeDate =
      isConfirmed && timeEndDate ? moment(timeEndDate).format(SNOOZE_DATE_DISPLAY_FORMAT) : null;

    const dataPreviewPart =
      confirmedDataConditions.length > 0
        ? confirmedDataConditions
            .map(
              ({ field, operator, value }) =>
                `${field} ${i18n.CONDITIONAL_OPERATOR(operator)} ${value}`
            )
            .reduce(
              (acc, part, index) =>
                `${acc} ${i18n.LOGICAL_SEPARATOR(
                  confirmedDataConditions[index - 1].logicalOperator
                )} ${part}`
            )
        : null;

    if (!formattedTimeDate && !dataPreviewPart) {
      return i18n.CONDITIONS_FOOTER_HINT;
    }

    if (formattedTimeDate && !dataPreviewPart) {
      return i18n.getUnsnoozeOnDateMessage(formattedTimeDate);
    }

    const parts = [
      dataPreviewPart,
      formattedTimeDate ? `it is after ${formattedTimeDate}` : null,
    ].filter((p): p is string => p !== null);

    return i18n.getUnsnoozeIfConditionsMessage(parts.join(` ${i18n.LOGICAL_SEPARATOR('or')} `));
  }, [isConfirmed, timeEndDate, confirmedDataConditions]);

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

  const toggleLogicalOperator = useCallback((id: string) => {
    setDataConditions((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, logicalOperator: c.logicalOperator === 'and' ? 'or' : 'and' } : c
      )
    );
  }, []);

  const snoozeSchedule = useMemo<ConditionalSnoozeSchedule | undefined>(() => {
    if (isSnoozeDisabled) return undefined;

    const schedule: ConditionalSnoozeSchedule = {};

    if (isConfirmed && timeEndDate) {
      schedule.expires_at = timeEndDate;
    }

    if (confirmedDataConditions.length > 0) {
      schedule.conditions = confirmedDataConditions.map(toSnoozeCondition);
      const hasOrOperator = confirmedDataConditions
        .slice(0, -1)
        .some((c) => c.logicalOperator === 'or');
      schedule.condition_operator = hasOrOperator ? 'any' : 'all';
    }

    return schedule;
  }, [isSnoozeDisabled, isConfirmed, timeEndDate, confirmedDataConditions]);

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
                <EuiButton
                  size="s"
                  color="text"
                  style={{ borderRadius: '999px', minWidth: 'unset' }}
                  onClick={() => toggleLogicalOperator(dataConditions[index - 1].id)}
                  data-test-subj={`logicalOperator-${dataConditions[index - 1].id}`}
                >
                  {i18n.LOGICAL_SEPARATOR(dataConditions[index - 1].logicalOperator)}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem style={{ alignSelf: 'center' }}>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          <DataConditionPanel
            entry={entry}
            fieldOptions={fieldOptions}
            onChange={(newEntryDetails) => handleDataConditionChange(entry.id, newEntryDetails)}
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

      <EuiText size="s" color="subdued" data-test-subj="conditionsPreviewText">
        <p>{previewText}</p>
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};
