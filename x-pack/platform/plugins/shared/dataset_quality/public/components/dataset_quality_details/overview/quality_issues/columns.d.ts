import type { EuiBasicTableColumn } from '@elastic/eui';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { QualityIssue } from '../../../../../common/api_types';
import type { QualityIssueType } from '../../../../state_machines/dataset_quality_details_controller';
export declare const getQualityIssuesColumns: ({ dateFormatter, isLoading, expandedQualityIssue, openQualityIssueFlyout, }: {
    dateFormatter: FieldFormat;
    isLoading: boolean;
    expandedQualityIssue?: {
        name: string;
        type: QualityIssueType;
    };
    openQualityIssueFlyout: (name: string, type: QualityIssueType) => void;
}) => Array<EuiBasicTableColumn<QualityIssue>>;
