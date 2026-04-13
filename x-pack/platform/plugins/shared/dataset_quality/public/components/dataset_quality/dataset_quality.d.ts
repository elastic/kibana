import type { CoreStart } from '@kbn/core/public';
import React from 'react';
import type { DatasetQualityController } from '../../controller/dataset_quality';
import type { ITelemetryClient } from '../../services/telemetry';
import type { DatasetQualityStartDeps } from '../../types';
export interface DatasetQualityProps {
    controller: DatasetQualityController;
}
export interface CreateDatasetQualityArgs {
    core: CoreStart;
    plugins: DatasetQualityStartDeps;
    telemetryClient: ITelemetryClient;
}
export declare const DatasetQuality: ({ controller, core, plugins, telemetryClient, }: DatasetQualityProps & CreateDatasetQualityArgs) => React.JSX.Element;
