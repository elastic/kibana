/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer, EuiFormRow, EuiTextArea, EuiText, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
import { useDataSourceSelector } from '../state_management/data_source_state_machine';
import type { RawSamplesDataSourceWithUIAttributes } from '../types';
import { DataSourceCard } from './data_source_card';
import { DATA_SOURCES_I18N } from './translations';

interface RawSamplesDataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
}

export const RawSamplesDataSourceCard = ({ dataSourceRef }: RawSamplesDataSourceCardProps) => {
  const dataSource = useDataSourceSelector(
    dataSourceRef,
    (state) => state.context.dataSource
  ) as RawSamplesDataSourceWithUIAttributes;

  const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dataSourceRef.send({
      type: 'dataSource.change',
      dataSource: {
        ...dataSource,
        condition: e.target.value || undefined,
      },
    });
  };

  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={DATA_SOURCES_I18N.rawSamples.defaultName}
      subtitle={DATA_SOURCES_I18N.rawSamples.subtitle}
      isForCompleteSimulation
    >
      <EuiCallOut iconType="beaker" size="s" title={DATA_SOURCES_I18N.rawSamples.callout} />
      <EuiSpacer size="m" />

      <EuiFormRow
        label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.rawSamples.conditionLabel',
          { defaultMessage: 'OTTL Condition (Optional)' }
        )}
        helpText={
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.rawSamples.conditionHelp',
              {
                defaultMessage:
                  'Filter sampled documents using OpenTelemetry Transformation Language. Example: ',
              }
            )}
            <EuiCode>{'attributes["service.name"] == "my-service"'}</EuiCode>
          </EuiText>
        }
        fullWidth
      >
        <EuiTextArea
          placeholder={i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.rawSamples.conditionPlaceholder',
            { defaultMessage: 'attributes["log.level"] == "ERROR"' }
          )}
          value={dataSource.condition || ''}
          onChange={handleConditionChange}
          rows={3}
          fullWidth
        />
      </EuiFormRow>
    </DataSourceCard>
  );
};
