import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { ConfusionMatrix } from '@kbn/ml-data-frame-analytics-utils';
export interface ConfusionMatrixColumn {
    id: string;
    display?: JSX.Element;
    initialWidth?: number;
}
export interface ConfusionMatrixColumnData {
    actual_class: string;
    actual_class_doc_count: number;
    other: number;
    predicted_classes_count: Record<string, number>;
}
export declare const ACTUAL_CLASS_ID = "actual_class";
export declare const OTHER_CLASS_ID = "other";
export declare const MAX_COLUMNS = 6;
export declare function getColumnData(confusionMatrixData: ConfusionMatrix[]): {
    columns: ConfusionMatrixColumn[];
    columnData: ConfusionMatrixColumnData[];
};
export declare function getTrailingControlColumns(numColumns: number, setShowFullColumns: any): EuiDataGridControlColumn[];
