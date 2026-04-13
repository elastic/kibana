import type { Observable } from 'rxjs';
import type { DatasetQualityDetailsControllerStateService, QualityIssuesTableConfig, WithDefaultControllerState } from '../../state_machines/dataset_quality_details_controller';
type QuaityIssuesTableSortOptions = Omit<QualityIssuesTableConfig['table']['sort'], 'field'> & {
    field: string;
};
export type DatasetQualityIssuesTableOptions = Partial<Omit<QualityIssuesTableConfig['table'], 'sort'> & {
    sort?: QuaityIssuesTableSortOptions;
}>;
export type StreamViewType = 'classic' | 'wired';
/**
 * The different views that the Dataset Quality Details can be in.
 * - `classic` view is for classic streams' data quality
 * - `wired` view is for wired streams' data quality
 * - `dataQuality` view is for Data Quality app
 */
export type DatasetQualityView = StreamViewType | 'dataQuality';
export type DatasetQualityDetailsPublicState = WithDefaultControllerState;
export type DatasetQualityDetailsPublicStateUpdate = Partial<Pick<WithDefaultControllerState, 'timeRange' | 'breakdownField' | 'showCurrentQualityIssues' | 'selectedIssueTypes' | 'selectedFields' | 'expandedQualityIssue' | 'qualityIssuesChart' | 'streamDefinition' | 'streamsUrls'>> & {
    dataStream: string;
} & {
    qualityIssues?: {
        table?: DatasetQualityIssuesTableOptions;
    };
} & {
    view?: DatasetQualityView;
};
export interface DatasetQualityDetailsController {
    state$: Observable<DatasetQualityDetailsPublicState>;
    service: DatasetQualityDetailsControllerStateService;
}
export {};
