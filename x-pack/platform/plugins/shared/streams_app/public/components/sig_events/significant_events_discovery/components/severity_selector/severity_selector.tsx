/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  SeverityBadge,
  SIGNIFICANT_EVENT_SEVERITY,
  scoreSeverity,
} from '../severity_badge/severity_badge';

export function SeveritySelector({
  severityScore,
  onChange,
  disabled,
}: {
  severityScore: number | undefined;
  onChange: (score: number | undefined) => void;
  disabled?: boolean;
}) {
  const severityOptions = [
    {
      value: -1,
      inputDisplay: <SeverityBadge />,
    },
    ...Object.values(SIGNIFICANT_EVENT_SEVERITY).map((severity) => ({
      value: severity.defaultValue,
      inputDisplay: <SeverityBadge score={severity.defaultValue} />,
    })),
  ].reverse();

  return (
    <EuiSuperSelect
      aria-label={SEVERITY_SELECTOR_ARIA_LABEL}
      disabled={disabled}
      options={severityOptions}
      valueOfSelected={
        severityScore
          ? SIGNIFICANT_EVENT_SEVERITY[scoreSeverity(severityScore)].defaultValue ??
            SIGNIFICANT_EVENT_SEVERITY.medium.defaultValue
          : -1
      }
      onChange={(value) => onChange(value === -1 ? undefined : value)}
      placeholder={i18n.translate(
        'xpack.streams.addSignificantEventFlyout.manualFlow.severityPlaceholder',
        { defaultMessage: 'Select severity' }
      )}
      fullWidth
    />
  );
}

const SEVERITY_SELECTOR_ARIA_LABEL = i18n.translate(
  'xpack.streams.significantEvents.severitySelector.ariaLabel',
  {
    defaultMessage: 'Select severity',
  }
);
