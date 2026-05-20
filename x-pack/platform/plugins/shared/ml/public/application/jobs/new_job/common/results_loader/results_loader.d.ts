import { BehaviorSubject } from 'rxjs';
import type { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { JobCreatorType } from '../job_creator';
import type { ChartLoader } from '../chart_loader';
export interface Results {
    progress: number;
    model: Record<number, ModelItem[]>;
    anomalies: Record<number, Anomaly[]>;
}
export interface ModelItem {
    time: number;
    actual: number;
    modelUpper: number;
    modelLower: number;
}
export interface Anomaly {
    time: number;
    value: number;
    severity: ML_ANOMALY_SEVERITY;
}
export type ResultsSubscriber = (results: Results) => void;
export declare class ResultsLoader {
    private _results$;
    private _resultsSearchRunning;
    private _jobCreator;
    private _chartInterval;
    private _lastModelTimeStamp;
    private _lastResultsTimeout;
    private _chartLoader;
    private _mlResultsService;
    private _results;
    private _detectorSplitFieldFilters;
    private _splitFieldFiltersLoaded;
    constructor(jobCreator: JobCreatorType, chartInterval: TimeBuckets, chartLoader: ChartLoader);
    progressSubscriber: (progress: number) => Promise<void>;
    private _updateData;
    get results$(): BehaviorSubject<Results>;
    subscribeToResults(func: ResultsSubscriber): import("rxjs").Subscription;
    get progress(): number;
    private _clearResults;
    private _loadModelData;
    private _createModel;
    private _loadJobAnomalyData;
    private _loadDetectorsAnomalyData;
    private _populateDetectorSplitFieldFilters;
    private _calculateModelScale;
}
