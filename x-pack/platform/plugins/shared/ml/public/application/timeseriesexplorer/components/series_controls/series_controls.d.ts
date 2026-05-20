import type { FC, PropsWithChildren } from 'react';
import type { MlJob } from '@elastic/elasticsearch/lib/api/types';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import { type PartitionFieldConfig, type PartitionFieldsConfig } from '@kbn/ml-common-types/storage';
import type { MlEntity } from '../../../../embeddables';
export type UiPartitionFieldsConfig = Exclude<PartitionFieldsConfig, undefined>;
export type UiPartitionFieldConfig = Exclude<PartitionFieldConfig, undefined>;
interface SeriesControlsProps {
    appStateHandler: Function;
    bounds: any;
    direction?: 'column' | 'row';
    functionDescription?: string;
    job?: CombinedJob | MlJob;
    selectedDetectorIndex: number;
    selectedEntities?: MlEntity;
    selectedJobId: JobId;
    setFunctionDescription: (func: string) => void;
}
/**
 * Component for handling the detector and entities controls.
 */
export declare const SeriesControls: FC<PropsWithChildren<SeriesControlsProps>>;
export {};
