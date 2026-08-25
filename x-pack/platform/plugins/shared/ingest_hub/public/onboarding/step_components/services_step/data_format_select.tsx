/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DataFormat } from '../../aws_service_matrix';

const DATA_FORMAT_OPTIONS = [
  {
    value: 'ecs' as DataFormat,
    text: i18n.translate('xpack.ingestHub.servicesStep.dataFormat.ecs', {
      defaultMessage: 'ECS-compatible',
    }),
  },
  {
    value: 'otel' as DataFormat,
    text: i18n.translate('xpack.ingestHub.servicesStep.dataFormat.otel', {
      defaultMessage: 'OTel-native',
    }),
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

  const select = (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          <strong>
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.dataFormat.label"
              defaultMessage="Data format"
            />
          </strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {/* span needed: disabled <select> swallows pointer events; span intercepts for tooltip */}
        <span
          tabIndex={disabled ? 0 : undefined}
          style={disabled ? { display: 'inline-block' } : undefined}
        >
          <EuiSelect
            compressed
            aria-label={i18n.translate('xpack.ingestHub.servicesStep.dataFormat.ariaLabel', {
              defaultMessage: 'Data format',
            })}
            options={DATA_FORMAT_OPTIONS}
            value={dataFormat}
            onChange={(e) => onChange(e.target.value as DataFormat)}
            disabled={disabled}
            data-test-subj="servicesStep-dataFormatSelect"
          />
        </span>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  return (
    <>
      {disabled ? <EuiToolTip content={disabledTooltip}>{select}</EuiToolTip> : select}
      {dataFormat === 'otel' && (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            announceOnMount
            size="s"
            iconType="info"
            title={
              <FormattedMessage
                id="xpack.ingestHub.servicesStep.dataFormat.otelCallout.title"
                defaultMessage="OTel-native coverage is currently limited to log services via the Elastic Cloud Forwarder"
              />
            }
            data-test-subj="servicesStep-otelCallout"
          >
            <FormattedMessage
              id="xpack.ingestHub.servicesStep.dataFormat.otelCallout.body"
              defaultMessage="Switch to ECS-compatible to see metrics services and the full AWS catalog."
            />
          </EuiCallOut>
        </>
      )}
    </>
  );
}
