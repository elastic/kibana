import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { DatasetQualityDetailsController } from '../../controller/dataset_quality_details';
import type { DatasetQualityStartDeps } from '../../types';
import type { ITelemetryClient } from '../../services/telemetry';
export interface DatasetQualityDetailsProps {
    controller: DatasetQualityDetailsController;
}
export interface CreateDatasetQualityArgs {
    core: CoreStart;
    plugins: DatasetQualityStartDeps;
    telemetryClient: ITelemetryClient;
}
export declare const createDatasetQualityDetails: ({ core, plugins, telemetryClient, }: CreateDatasetQualityArgs) => ({ controller }: DatasetQualityDetailsProps) => React.JSX.Element;
