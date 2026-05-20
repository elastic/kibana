import type { FC } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { GroupsDictionary } from './anomaly_detection_panel';
export declare enum AnomalyDetectionListColumns {
    id = "id",
    maxAnomalyScore = "max_anomaly_score",
    overallSwimLane = "overallSwimLane",
    jobIds = "jobIds",
    latestTimestamp = "latest_timestamp",
    docsProcessed = "docs_processed",
    jobsInGroup = "jobs_in_group"
}
interface Props {
    items: GroupsDictionary;
    chartsService: ChartsPluginStart;
}
export declare const AnomalyDetectionTable: FC<Props>;
export {};
