/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useEffect } from 'react';
import moment from 'moment';
import { css } from '@emotion/react';
import { EuiButtonGroup, EuiHorizontalRule, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { SnoozeUnit, QuickDurationId, CustomDurationState } from './types';
import { SNOOZE_DATE_DISPLAY_FORMAT, SNOOZE_UNIT_OPTIONS } from './constants';
import { validateDuration, computeEndDate } from '../utils/duration_validation';
import * as i18n from './translations';
import { SnoozeDurationPicker } from './snooze_duration_picker';

export type { SnoozeUnit, QuickDurationId, CustomSnoozeMode, CustomDurationState } from './types';

export interface QuickSnoozePanelProps {
  /**
   * Called with the current snooze end date whenever the selection changes.
   * `undefined` means the selection is invalid (button should be disabled).
   * `null` means indefinite snooze.
   */
  onScheduleChange: (endDate: string | null | undefined) => void;
}

// Character class built from SNOOZE_UNIT_OPTIONS so unit values have a single source of truth.
const DURATION_ID_REGEX = new RegExp(
  `^(?<value>\\d+)(?<unit>[${SNOOZE_UNIT_OPTIONS.map((o) => o.value).join('')}])$`
);

const SNOOZE_PRESET_OPTIONS: Array<{ id: QuickDurationId; label: string }> = [
  { id: 'indefinitely', label: i18n.DURATION_INDEFINITELY },
  { id: '1h', label: '1h' },
  { id: '8h', label: '8h' },
  { id: '24h', label: '24h' },
  { id: 'custom', label: i18n.DURATION_CUSTOM },
];

export const QuickSnoozePanel = ({ onScheduleChange }: QuickSnoozePanelProps) => {
  const [selectedDuration, setSelectedDuration] = useState<QuickDurationId>('indefinitely');
  const [customDuration, setCustomDuration] = useState<CustomDurationState>({
    mode: 'duration',
    value: 1,
    unit: 'h',
    dateTime: null,
  });

  const {
    isDurationInvalid: isCustomDurationInvalid,
    isPastDateTime,
    isDateTimeMissing,
  } = validateDuration(selectedDuration === 'custom' ? customDuration : null);
  const isCustomInvalid = isCustomDurationInvalid || isPastDateTime || isDateTimeMissing;
  const isSnoozeDisabled = selectedDuration === 'custom' && isCustomInvalid;

  const snoozeEndDate = useMemo<string | null>(() => {
    if (selectedDuration === 'indefinitely') return null;

    if (selectedDuration === 'custom') {
      if (isCustomInvalid) return null;
      return computeEndDate(customDuration);
    }

    const { value, unit } = selectedDuration.match(DURATION_ID_REGEX)?.groups ?? {};
    return value && unit
      ? moment()
          .add(Number(value), unit as SnoozeUnit)
          .toISOString()
      : null;
  }, [selectedDuration, customDuration, isCustomInvalid]);

  useEffect(() => {
    onScheduleChange(isSnoozeDisabled ? undefined : snoozeEndDate);
  }, [snoozeEndDate, isSnoozeDisabled, onScheduleChange]);

  const previewText = isCustomDurationInvalid
    ? null
    : snoozeEndDate === null
    ? selectedDuration === 'indefinitely'
      ? i18n.INDEFINITELY_MESSAGE
      : null
    : i18n.getUnsnoozeOnDateMessage(moment(snoozeEndDate).format(SNOOZE_DATE_DISPLAY_FORMAT));

  return (
    <>
      <EuiText size="s">
        <p>{i18n.DURATION_QUESTION}</p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonGroup
        legend={i18n.DURATION_LEGEND}
        options={SNOOZE_PRESET_OPTIONS}
        idSelected={selectedDuration}
        onChange={(id) => setSelectedDuration(id as QuickDurationId)}
        data-test-subj="quickSnoozeDurationOptions"
        buttonSize="compressed"
        isFullWidth
        css={css`
          .euiButtonGroup__buttons > *:nth-of-type(1) {
            flex-grow: 2.4;
          }
          .euiButtonGroup__buttons > *:nth-of-type(4) {
            flex-grow: 1.2;
          }
          .euiButtonGroup__buttons > *:nth-of-type(5) {
            flex-grow: 2;
          }
        `}
      />

      {selectedDuration === 'custom' && (
        <>
          <EuiSpacer size="s" />
          <SnoozeDurationPicker
            value={customDuration}
            onChange={(update) => setCustomDuration((prev) => ({ ...prev, ...update }))}
            isDurationInvalid={isCustomDurationInvalid}
            isDateTimeInvalid={isPastDateTime}
          />
        </>
      )}

      <EuiHorizontalRule margin="m" />

      {previewText !== null && (
        <EuiPanel color="subdued" paddingSize="s" hasBorder={false} hasShadow={false}>
          <EuiText size="xs" data-test-subj="quickSnoozeUnsnoozeTime" color="subdued">
            <p>{previewText}</p>
          </EuiText>
        </EuiPanel>
      )}

      <EuiSpacer size="m" />
    </>
  );
};
