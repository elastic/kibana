import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { type MlEntityField, type MlRecordForInfluencer } from '@kbn/ml-anomaly-utils';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { SwimlaneType } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { CombinedJob } from '@kbn/ml-common-types/anomaly_detection_jobs/combined_job';
import type { AnnotationsTable } from '@kbn/ml-common-types/annotations';
import type { MlIndexUtils } from '../util/index_service';
import type { MlJobService } from '../services/job_service';
import type { MlApi } from '../services/ml_api_service';
import type { GroupObj } from '../components/job_selector/job_selector';
import type { TableSeverityState } from '../components/controls/select_severity';
export interface ExplorerJob {
    id: string;
    selected: boolean;
    bucketSpanSeconds: number;
    isSingleMetricViewerJob?: boolean;
    sourceIndices?: string[];
    modelPlotEnabled: boolean;
    groups?: string[];
}
export declare function isExplorerJob(arg: unknown): arg is ExplorerJob;
interface ClearedSelectedAnomaliesState {
    selectedCells: undefined;
}
export interface SwimlanePoint {
    laneLabel: string;
    time: number;
    value: number;
}
export interface SwimlaneData {
    fieldName?: string;
    laneLabels: string[];
    points: SwimlanePoint[];
    interval: number;
}
export interface AppStateSelectedCells {
    type: SwimlaneType;
    lanes: string[];
    times: [number, number];
    showTopFieldValues?: boolean;
    viewByFieldName?: string;
}
interface SelectionTimeRange {
    earliestMs: number;
    latestMs: number;
}
export interface AnomaliesTableData {
    anomalies: any[];
    interval: number | string;
    examplesByJobId: Record<string, Record<string, string[]>>;
    showViewSeriesLink: boolean;
    jobIds: string[];
}
export interface ChartRecord extends MlRecordForInfluencer {
    function: string;
}
export interface OverallSwimlaneData extends SwimlaneData {
    /**
     * Earliest timestamp in seconds
     */
    earliest: number;
    /**
     * Latest timestamp in seconds
     */
    latest: number;
}
export interface ViewBySwimLaneData extends OverallSwimlaneData {
    cardinality: number;
}
export interface SourceIndexGeoFields {
    [key: string]: {
        geoFields: string[];
        dataViewId: string;
    };
}
export interface SourceIndicesWithGeoFields {
    [key: string]: SourceIndexGeoFields;
}
export declare function createJobs(jobs: CombinedJob[]): ExplorerJob[];
export declare function getClearedSelectedAnomaliesState(): ClearedSelectedAnomaliesState;
export declare function getDefaultSwimlaneData(): SwimlaneData;
export declare function getInfluencers(mlJobService: MlJobService, selectedJobs: any[]): string[];
export declare function useDateFormatTz(): string;
export declare function getDateFormatTz(uiSettings: IUiSettingsClient): string;
export declare function getFieldsByJob(mlJobService: MlJobService): Record<string, string[]>;
export declare function getSelectionTimeRange(selectedCells: AppStateSelectedCells | undefined | null, bounds: TimeRangeBounds): SelectionTimeRange;
export declare function getSelectionInfluencers(selectedCells: AppStateSelectedCells | undefined | null, fieldName: string): MlEntityField[];
export declare function getSelectionJobIds(selectedCells: AppStateSelectedCells | undefined | null, selectedJobs: ExplorerJob[]): string[];
export declare function loadAnnotationsTableData(mlApi: MlApi, selectedCells: AppStateSelectedCells | undefined | null, selectedJobs: ExplorerJob[], bounds: Required<TimeRangeBounds>): Promise<AnnotationsTable>;
export declare function loadAnomaliesTableData(mlApi: MlApi, mlJobService: MlJobService, selectedCells: AppStateSelectedCells | undefined | null, selectedJobs: ExplorerJob[], dateFormatTz: string, bounds: Required<TimeRangeBounds>, fieldName: string, tableInterval: string, tableSeverity: TableSeverityState, influencersFilterQuery?: InfluencersFilterQuery): Promise<AnomaliesTableData>;
export declare function escapeRegExp(string: string): string;
export declare function escapeParens(string: string): string;
export declare function escapeDoubleQuotes(string: string): string;
export declare function getQueryPattern(fieldName: string, fieldValue: string): RegExp;
export declare function removeFilterFromQueryString(currentQueryString: string, fieldName: string, fieldValue: string): string;
export declare function getDataViewsAndIndicesWithGeoFields(selectedJobs: Array<CombinedJob | ExplorerJob>, dataViewsService: DataViewsContract, mlIndexUtils: MlIndexUtils): Promise<{
    sourceIndicesWithGeoFieldsMap: SourceIndicesWithGeoFields;
    dataViews: DataView[];
}>;
export declare function getIndexPattern(influencers: ExplorerJob[]): {
    title: string;
    fields: {
        name: string;
        type: string;
        aggregatable: boolean;
        searchable: boolean;
    }[];
};
export declare function getMergedGroupsAndJobsIds(groups: GroupObj[], selectedJobs: ExplorerJob[]): string[];
export {};
