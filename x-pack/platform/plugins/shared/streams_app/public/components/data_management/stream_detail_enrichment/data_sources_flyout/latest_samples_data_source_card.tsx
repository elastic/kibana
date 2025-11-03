/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
import { DataSourceCard } from './data_source_card';
import { DATA_SOURCES_I18N } from './translations';

interface LatestSamplesDataSourceCardProps {
  readonly dataSourceRef: DataSourceActorRef;
}

export const LatestSamplesDataSourceCard = ({
  dataSourceRef,
}: LatestSamplesDataSourceCardProps) => {
  return (
    <DataSourceCard
      dataSourceRef={dataSourceRef}
      title={DATA_SOURCES_I18N.latestSamples.defaultName}
      subtitle={DATA_SOURCES_I18N.latestSamples.subtitle}
    >
      <EuiCallOut iconType="info" size="s" title={DATA_SOURCES_I18N.latestSamples.callout} />
      <EuiSpacer size="m" />
    </DataSourceCard>
  );
};
