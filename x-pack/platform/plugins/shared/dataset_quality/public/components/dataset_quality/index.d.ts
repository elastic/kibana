import React from 'react';
import type { CreateDatasetQualityArgs, DatasetQualityProps } from './dataset_quality';
export type { CreateDatasetQualityArgs, DatasetQualityProps };
export declare const createDatasetQuality: ({ core, plugins, telemetryClient, }: CreateDatasetQualityArgs) => ({ controller }: DatasetQualityProps) => React.JSX.Element;
