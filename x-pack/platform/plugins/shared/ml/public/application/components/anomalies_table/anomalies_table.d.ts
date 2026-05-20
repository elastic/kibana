import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { type FC } from 'react';
import type { AnomaliesTableData, ExplorerJob, SourceIndicesWithGeoFields } from '../../explorer/explorer_utils';
import type { FilterAction } from '../../explorer/explorer_constants';
import type { CustomRuleEditorSource } from '../../../../common/constants/usage_collection';
interface AnomaliesTableProps {
    bounds?: TimeRangeBounds;
    tableData: AnomaliesTableData;
    filter?: (field: string, value: string, operator: string) => void;
    influencerFilter?: (fieldName: string, fieldValue: string, action: FilterAction) => void;
    sourceIndicesWithGeoFields: SourceIndicesWithGeoFields;
    selectedJobs: ExplorerJob[];
    telemetrySource: Extract<CustomRuleEditorSource, 'explorer_anomalies_table' | 'single_metric_viewer_anomalies_table'>;
}
interface AnomaliesTableState {
    pageIndex: number;
    pageSize: number;
    sortField: string;
    sortDirection: 'asc' | 'desc';
}
export declare const getDefaultAnomaliesTableState: () => AnomaliesTableState;
export declare const AnomaliesTable: FC<AnomaliesTableProps>;
export {};
