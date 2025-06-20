/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  DataSourceActorRef,
  useDataSourceSelector,
} from '../state_management/data_source_state_machine';
import { RandomSamplesDataSourceCard } from './random_samples_data_source_card';
import { KqlSamplesDataSourceCard } from './kql_samples_data_source_card';
import { CustomSamplesDataSourceCard } from './custom_samples_data_source_card';

interface DataSourceProps {
  readonly dataSourceRef: DataSourceActorRef;
}

export const DataSource = ({ dataSourceRef }: DataSourceProps) => {
  const dataSourceType = useDataSourceSelector(
    dataSourceRef,
    (snapshot) => snapshot.context.dataSource.type
  );

  switch (dataSourceType) {
    case 'random-samples':
      return <RandomSamplesDataSourceCard dataSourceRef={dataSourceRef} />;
    case 'kql-samples':
      return <KqlSamplesDataSourceCard dataSourceRef={dataSourceRef} />;
    case 'custom-samples':
      return <CustomSamplesDataSourceCard dataSourceRef={dataSourceRef} />;
    default:
      return null;
  }
};
