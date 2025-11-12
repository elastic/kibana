/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiSpacer,
  EuiText,
  EuiCode,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
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

  const isSampling = useDataSourceSelector(dataSourceRef, (state) =>
    state.matches({ enabled: 'enablingSampling' })
  );

  const handleStopSampling = () => {
    dataSourceRef.send({
      type: 'sampling.stop',
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

      <EuiText size="s">
        <p>
          <FormattedMessage
            id="xpack.streams.streamDetailView.managementTab.enrichment.rawSamples.conditionInfo"
            defaultMessage="Sampling is automatically configured to filter documents for this stream using the condition: {condition}"
            values={{
              condition: <EuiCode>{dataSource.condition || 'None'}</EuiCode>,
            }}
          />
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color="danger"
            onClick={handleStopSampling}
            isLoading={isSampling}
            data-test-subj="streamsAppStopSamplingButton"
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.managementTab.enrichment.rawSamples.stopSampling',
              { defaultMessage: 'Stop sampling' }
            )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </DataSourceCard>
  );
};
