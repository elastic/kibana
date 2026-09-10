/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSuperSelect, EuiText, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DataFormat } from '../../aws_service_matrix';

// inputDisplay and dropdownDisplay intentionally share the same i18n key — they render
// the same label string in different contexts (collapsed select vs open dropdown).
const DATA_FORMAT_OPTIONS = [
  {
    value: 'otel' as DataFormat,
    inputDisplay: i18n.translate('xpack.ingestHub.servicesStep.dataFormat.otel', {
      defaultMessage: 'OTel-native',
    }),
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.dataFormat.otel"
            defaultMessage="OTel-native"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.dataFormat.otel.description"
              defaultMessage="OpenTelemetry semantic conventions. Some services have limited content today."
            />
          </p>
        </EuiText>
      </>
    ),
  },
  {
    value: 'ecs' as DataFormat,
    inputDisplay: i18n.translate('xpack.ingestHub.servicesStep.dataFormat.ecs', {
      defaultMessage: 'ECS-compatible',
    }),
    dropdownDisplay: (
      <>
        <strong>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.dataFormat.ecs"
            defaultMessage="ECS-compatible"
          />
        </strong>
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.dataFormat.ecs.description"
              defaultMessage="Elastic Common Schema field mappings — the default, broadest content coverage."
            />
          </p>
        </EuiText>
      </>
    ),
  },
];

interface DataFormatSelectProps {
  dataFormat: DataFormat;
  onChange: (format: DataFormat) => void;
  disabled: boolean;
}

export function DataFormatSelect({ dataFormat, onChange, disabled }: DataFormatSelectProps) {
  const disabledTooltip = i18n.translate(
    'xpack.ingestHub.servicesStep.dataFormat.disabledTooltip',
    {
      defaultMessage:
        'Data format cannot be changed after services have been deployed. Start a new session to choose a different format.',
    }
  );

  const prepend = i18n.translate('xpack.ingestHub.servicesStep.dataFormat.label', {
    defaultMessage: 'Data format',
  });

  const select = (
    <EuiSuperSelect
      compressed
      prepend={prepend}
      aria-label={prepend}
      options={DATA_FORMAT_OPTIONS}
      valueOfSelected={dataFormat}
      onChange={onChange}
      disabled={disabled}
      data-test-subj="servicesStep-dataFormatSelect"
    />
  );

  // span needed: disabled EuiSuperSelect has pointer-events:none; the span intercepts hover
  // events so the tooltip fires even when the select is non-interactive.
  return disabled ? (
    <EuiToolTip content={disabledTooltip}>
      <span tabIndex={0} style={{ display: 'inline-block' }}>
        {select}
      </span>
    </EuiToolTip>
  ) : (
    select
  );
}
