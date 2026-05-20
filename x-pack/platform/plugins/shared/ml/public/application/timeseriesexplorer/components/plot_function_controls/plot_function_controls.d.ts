import React from 'react';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { MlEntity } from '../../../../embeddables';
export declare const PlotByFunctionControls: ({ functionDescription, job, setFunctionDescription, selectedDetectorIndex, selectedJobId, selectedEntities, entityControlsCount, }: {
    functionDescription: undefined | string;
    job?: CombinedJob | MlJob;
    setFunctionDescription: (func: string) => void;
    selectedDetectorIndex: number;
    selectedJobId: string;
    selectedEntities?: MlEntity;
    entityControlsCount: number;
}) => React.JSX.Element | null;
