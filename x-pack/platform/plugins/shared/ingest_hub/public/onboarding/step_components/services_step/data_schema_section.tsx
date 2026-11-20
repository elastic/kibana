/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { DataFormat } from '../../aws_service_matrix';
import { ChoiceCards } from '../choice_cards';
import type { ChoiceCardOption } from '../choice_cards';

const DATA_SCHEMA_OPTIONS: Array<ChoiceCardOption<DataFormat>> = [
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
  const options = DATA_SCHEMA_OPTIONS.map((option) => ({
    ...option,
    isRecommended: option.value === recommendedFormat,
  }));

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
      <ChoiceCards
        options={options}
        selectedValue={dataFormat}
        onChange={onChange}
        disabled={disabled}
        disabledTooltip={i18n.translate('xpack.ingestHub.servicesStep.dataSchema.disabledTooltip', {
          defaultMessage:
            'Data schema cannot be changed after services have been deployed. Start a new session to choose a different schema.',
        })}
        testSubjPrefix="servicesStep-dataSchema"
      />
    </section>
  );
}
