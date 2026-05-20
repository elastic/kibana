import { type Observable } from 'rxjs';
import type { CriteriaField } from '@kbn/ml-common-types/results';
import type { Job } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type { MlApi } from '../../services/ml_api_service';
export interface AnomaliesTableEnrichmentJobService {
    source: 'jobService';
    detectorsByJob: Record<string, Record<number, {
        detector_description?: string;
        custom_rules?: unknown[];
    }>>;
    customUrlsByJob: Record<string, unknown>;
}
export interface AnomaliesTableEnrichmentSingleJob {
    source: 'singleJob';
    selectedJob: Pick<Job, 'job_id' | 'analysis_config' | 'custom_settings'>;
}
export type AnomaliesTableEnrichment = AnomaliesTableEnrichmentJobService | AnomaliesTableEnrichmentSingleJob;
export interface FetchAnomaliesTableDataParams {
    mlApi: MlApi;
    jobId: string;
    criteriaFields: CriteriaField[];
    tableInterval: string;
    /** Raw severity from props; normalized before calling the API. */
    tableSeverity: unknown;
    earliestMs: number;
    latestMs: number;
    dateFormatTz: string;
    functionDescription?: string;
    enrichment: AnomaliesTableEnrichment;
}
/**
 * Shared anomalies table pipeline for SMV page and embeddable chart.
 */
export declare function fetchAnomaliesTableData$({ tableSeverity, mlApi, jobId, criteriaFields, tableInterval, earliestMs, latestMs, dateFormatTz, functionDescription, enrichment, }: FetchAnomaliesTableDataParams): Observable<{
    tableData: {
        anomalies: unknown[];
        interval: unknown;
        examplesByJobId: unknown;
        showViewSeriesLink: boolean;
    };
}>;
