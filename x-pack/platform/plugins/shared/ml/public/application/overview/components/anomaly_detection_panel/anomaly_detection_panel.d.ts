import type { FC } from 'react';
import React from 'react';
import type { Dictionary } from '@kbn/ml-common-types/common';
import type { MlSummaryJob } from '@kbn/ml-common-types/anomaly_detection_jobs/summary_job';
import type { AnomalyTimelineService } from '../../../services/anomaly_timeline_service';
import type { OverallSwimlaneData } from '../../../explorer/explorer_utils';
export type GroupsDictionary = Dictionary<Group>;
export interface Group {
    id: string;
    jobs: MlSummaryJob[];
    jobIds: string[];
    docs_processed: number;
    earliest_timestamp?: number;
    latest_timestamp?: number;
    max_anomaly_score: number | undefined | null;
    jobs_in_group: number;
    overallSwimLane?: OverallSwimlaneData;
}
interface Props {
    anomalyTimelineService: AnomalyTimelineService;
    setLazyJobCount: React.Dispatch<React.SetStateAction<number>>;
}
export declare const AnomalyDetectionPanel: FC<Props>;
export {};
