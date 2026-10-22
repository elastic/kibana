/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCheckableCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DataFormat } from '../../aws_service_matrix';

interface DataSchemaOption {
  value: DataFormat;
  name: string;
  description: string;
}

const DATA_SCHEMA_OPTIONS: DataSchemaOption[] = [
  {
    value: 'otel',
    name: i18n.translate('xpack.ingestHub.servicesStep.dataSchema.otel.name', {
      defaultMessage: 'OpenTelemetry',
    }),
    description: i18n.translate('xpack.ingestHub.servicesStep.dataSchema.otel.description', {
      defaultMessage: 'OpenTelemetry semantic conventions.',
    }),
  },
  {
    value: 'ecs',
    name: i18n.translate('xpack.ingestHub.servicesStep.dataSchema.ecs.name', {
      defaultMessage: 'ECS',
    }),
    description: i18n.translate('xpack.ingestHub.servicesStep.dataSchema.ecs.description', {
      defaultMessage: 'Elastic Common Schema field mappings - best for compatibility.',
    }),
  },
];

interface DataSchemaSectionProps {
  dataFormat: DataFormat;
  onChange: (format: DataFormat) => void;
  disabled: boolean;
  /** The schema to mark as recommended: the default one for the solution. */
  recommendedFormat: DataFormat;
}

export function DataSchemaSection({
  dataFormat,
  onChange,
  disabled,
  recommendedFormat,
}: DataSchemaSectionProps) {
  const radioGroupName = useGeneratedHtmlId({ prefix: 'dataSchema' });

  const cards = (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap>
      {DATA_SCHEMA_OPTIONS.map((option) => (
        <EuiFlexItem key={option.value} style={{ minWidth: 280 }}>
          <EuiCheckableCard
            id={`${radioGroupName}-${option.value}`}
            name={radioGroupName}
            checkableType="radio"
            value={option.value}
            checked={dataFormat === option.value}
            onChange={() => onChange(option.value)}
            disabled={disabled}
            data-test-subj={`servicesStep-dataSchema-${option.value}`}
            label={
              <>
                <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <strong>{option.name}</strong>
                  </EuiFlexItem>
                  {option.value === recommendedFormat && (
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow">
                        <FormattedMessage
                          id="xpack.ingestHub.servicesStep.dataSchema.recommended"
                          defaultMessage="Recommended"
                        />
                      </EuiBadge>
                    </EuiFlexItem>
                  )}
                </EuiFlexGroup>
                <EuiText size="s" color="subdued">
                  {option.description}
                </EuiText>
              </>
            }
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );

  const disabledTooltip = i18n.translate(
    'xpack.ingestHub.servicesStep.dataSchema.disabledTooltip',
    {
      defaultMessage:
        'Data schema cannot be changed after services have been deployed. Start a new session to choose a different schema.',
    }
  );

  return (
    <section data-test-subj="servicesStep-dataSchemaSection">
      <EuiTitle size="m">
        <h2>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.dataSchema.title"
            defaultMessage="Data schema"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.ingestHub.servicesStep.dataSchema.note"
            defaultMessage="This can't be changed after installation without creating a new integration policy."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      {/* span needed: disabled cards have pointer-events:none; the span intercepts hover events so
          the tooltip fires even when the cards are non-interactive. */}
      {disabled ? (
        <EuiToolTip content={disabledTooltip} display="block">
          <span tabIndex={0} style={{ display: 'block' }}>
            {cards}
          </span>
        </EuiToolTip>
      ) : (
        cards
      )}
    </section>
  );
}
