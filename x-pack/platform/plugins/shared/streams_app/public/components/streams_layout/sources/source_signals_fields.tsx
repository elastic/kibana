/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCheckbox, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  selectableSignalsForSourceType,
  sourceTypeSelectsSignals,
  type SourceSignal,
} from './source_models';
import type { SourceType } from './types';

const SIGNAL_LABELS: Record<SourceSignal, string> = {
  logs: i18n.translate('xpack.streams.sources.logsSignalLabel', {
    defaultMessage: 'Logs',
  }),
  metrics: i18n.translate('xpack.streams.sources.metricsSignalLabel', {
    defaultMessage: 'Metrics',
  }),
  traces: i18n.translate('xpack.streams.sources.tracesSignalLabel', {
    defaultMessage: 'Traces',
  }),
};

interface SourceSignalsFieldsProps {
  sourceType: SourceType;
  signals: SourceSignal[];
  disabled: boolean;
  isInvalid: boolean;
  onChange: (signals: SourceSignal[]) => void;
}

export const SourceSignalsFields = ({
  sourceType,
  signals,
  disabled,
  isInvalid,
  onChange,
}: SourceSignalsFieldsProps) => {
  if (!sourceTypeSelectsSignals(sourceType)) {
    return null;
  }

  const availableSignals = selectableSignalsForSourceType(sourceType);
  const toggleSignal = (signal: SourceSignal) => {
    const next = signals.includes(signal)
      ? signals.filter((candidate) => candidate !== signal)
      : [...signals, signal];
    onChange(availableSignals.filter((candidate) => next.includes(candidate)));
  };

  return (
    <EuiFormRow
      fullWidth
      isInvalid={isInvalid}
      error={
        isInvalid
          ? i18n.translate('xpack.streams.sources.signalsRequiredError', {
              defaultMessage: 'Select at least one signal.',
            })
          : undefined
      }
      label={i18n.translate('xpack.streams.sources.signalsLabel', {
        defaultMessage: 'Signals',
      })}
      helpText={i18n.translate('xpack.streams.sources.signalsHelpDescription', {
        defaultMessage: 'Choose which telemetry this source accepts.',
      })}
    >
      <EuiFlexGroup gutterSize="m" responsive={false}>
        {availableSignals.map((signal) => (
          <EuiFlexItem key={signal} grow={false}>
            <EuiCheckbox
              id={`streamsSourceSignal-${signal}`}
              label={SIGNAL_LABELS[signal]}
              checked={signals.includes(signal)}
              disabled={disabled}
              onChange={() => toggleSignal(signal)}
              data-test-subj={`streamsSourceSignal-${signal}`}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
