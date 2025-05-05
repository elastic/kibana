/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import type { CreateDatasetQualityArgs, DatasetQualityProps } from './dataset_quality';

export type { CreateDatasetQualityArgs, DatasetQualityProps };

const DatasetQuality = dynamic(() =>
  import('./dataset_quality').then((mod) => ({ default: mod.DatasetQuality }))
);

export const createDatasetQuality = ({
  core,
  plugins,
  telemetryClient,
  isFailureStoreEnabled,
}: CreateDatasetQualityArgs) => {
  return ({ controller }: DatasetQualityProps) => {
    return (
      <DatasetQuality
        controller={controller}
        core={core}
        plugins={plugins}
        telemetryClient={telemetryClient}
        isFailureStoreEnabled={isFailureStoreEnabled}
      />
    );
  };
};
