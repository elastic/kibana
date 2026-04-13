import type { DegradedField, FailedDocsDetails, QualityIssue } from '../../common/api_types';
import type { QualityIssueType } from '../state_machines/dataset_quality_details_controller';
export declare function filterIssues(data: QualityIssue[] | undefined, type: QualityIssueType): QualityIssue[];
export declare function mapDegradedFieldsIssues(degradedFields?: DegradedField[]): QualityIssue[];
export declare function mapFailedDocsIssues(failedDocsDetails: FailedDocsDetails): QualityIssue[];
