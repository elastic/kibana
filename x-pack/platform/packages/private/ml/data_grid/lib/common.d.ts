import type { estypes } from '@elastic/elasticsearch';
import type { EuiDataGridCellValueElementProps, EuiDataGridStyle } from '@elastic/eui';
import type { CoreSetup } from '@kbn/core/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import { type FeatureImportance, type TopClasses } from '@kbn/ml-data-frame-analytics-utils';
import type { DataGridItem, IndexPagination, RenderCellValue } from './types';
/**
 * The initial maximum number of columns for the data grid.
 */
export declare const INIT_MAX_COLUMNS = 10;
/**
 * The default maximum row count value, set to 10000 due to ES limitations.
 */
export declare const MAX_ROW_COUNT = 10000;
/**
 * Enum for index status
 */
export declare enum INDEX_STATUS {
    UNUSED = 0,
    LOADING = 1,
    LOADED = 2,
    ERROR = 3
}
/**
 * Style configuration for the EuiDataGrid component.
 */
export declare const euiDataGridStyle: EuiDataGridStyle;
/**
 * Configuration settings for the EuiDataGrid toolbar.
 */
export declare const euiDataGridToolbarSettings: {
    showColumnSelector: boolean;
    showDisplaySelector: boolean;
    showSortSelector: boolean;
    showFullScreenSelector: boolean;
};
/**
 * Retrieves fields from a Kibana data view.
 * @param {DataView} dataView - The Kibana data view.
 * @returns {string[]} - The array of field names from the data view.
 */
export declare const getFieldsFromKibanaDataView: (dataView: DataView) => string[];
/**
 * Retrieves just the populated fields from a Kibana data view.
 * @param {DataView} dataView - The Kibana data view.
 * @param {string[]} [populatedFields] - The populated fields.
 * returns {string[]} - The array of populated fields from the data view.
 */
export declare const getPopulatedFieldsFromKibanaDataView: (dataView: DataView, populatedFields?: string[]) => string[];
/**
 * Record of ES field types.
 */
export interface FieldTypes {
    [key: string]: ES_FIELD_TYPES;
}
/**
 * Creates an array of objects representing the data grid schemas for each field.
 * @param {FieldTypes} fieldTypes - The field types object.
 * @param {string} resultsField - The results field.
 * @returns {Array<{ id: string, schema: string | undefined, isSortable: boolean }>} - The array of data grid schemas.
 */
export declare const getDataGridSchemasFromFieldTypes: (fieldTypes: FieldTypes, resultsField: string) => {
    id: string;
    schema: string | undefined;
    isSortable: boolean;
}[];
export declare const NON_AGGREGATABLE = "non-aggregatable";
/**
 * Creates a data grid schema from an ES field type.
 * @param {ES_FIELD_TYPES | undefined | estypes.MappingRuntimeField['type'] | 'number'} fieldType - The ES field type.
 * @returns {string | undefined} - The data grid schema corresponding to the field type.
 */
export declare const getDataGridSchemaFromESFieldType: (fieldType: ES_FIELD_TYPES | undefined | estypes.MappingRuntimeField["type"] | "number") => string | undefined;
/**
 * Retrieves the data grid schema from the Kibana field type.
 * @param {(DataViewField | undefined)} field - The Kibana field object.
 * @returns {(string | undefined)} - The data grid schema corresponding to the field type.
 */
export declare const getDataGridSchemaFromKibanaFieldType: (field: DataViewField | undefined) => string | undefined;
/**
 * Helper to transform feature importance fields with arrays back to primitive value
 *
 * @param row - EUI data grid data row
 * @param mlResultsField - Data frame analytics results field
 * @param isClassTypeBoolean - Flag if the class type is boolean
 * @returns nested object structure of feature importance values
 */
export declare const getFeatureImportance: (row: DataGridItem, mlResultsField: string, isClassTypeBoolean?: boolean) => FeatureImportance[];
/**
 * Helper to transforms top classes fields with arrays back to original primitive value
 *
 * @param row - EUI data grid data row
 * @param mlResultsField - Data frame analytics results field
 * @returns nested object structure of feature importance values
 */
export declare const getTopClasses: (row: DataGridItem, mlResultsField: string) => TopClasses;
/**
 * Custom hook for rendering cell values in the data grid.
 *
 * @param {(DataView | undefined)} dataView - The data view.
 * @param {IndexPagination} pagination - The pagination settings.
 * @param {DataGridItem[]} tableItems - The table items.
 * @param {?string} [resultsField] - The results field.
 * @param {Function} cellPropsCallback - The callback function for setting cell properties.
 * @returns {RenderCellValue} - The render cell value function.
 */
export declare const useRenderCellValue: (dataView: DataView | undefined, pagination: IndexPagination, tableItems: DataGridItem[], resultsField?: string, cellPropsCallback?: (columnId: string, cellValue: any, fullItem: DataGridItem, setCellProps: EuiDataGridCellValueElementProps["setCellProps"]) => void) => RenderCellValue;
/**
 * Value can be nested or the fieldName itself might contain other special characters like `.`
 * @param {unknown} obj - The object to get the nested property from.
 * @param {string} sortId - The sort id attribute.
 * @returns {*}
 */
export declare const getNestedOrEscapedVal: (obj: unknown, sortId: string) => any;
/**
 * Interface definition for multi column sorter
 */
export interface MultiColumnSorter {
    /**
     * The id.
     */
    id: string;
    /**
     * The direction.
     */
    direction: 'asc' | 'desc';
    /**
     * The type of the sorter.
     */
    type: string;
}
/**
 * Helper to sort an array of objects based on an EuiDataGrid sorting configuration.
 * `sortFn()` is recursive to support sorting on multiple columns.
 *
 * @param sortingColumns - The EUI data grid sorting configuration
 * @returns The sorting function which can be used with an array's sort() function.
 */
export declare const multiColumnSortFactory: (sortingColumns: MultiColumnSorter[]) => (a: any, b: any, sortingColumnIndex?: number) => number;
/**
 * Displays an error toast message for the data grid column chart.
 *
 * @param {unknown} e - The error object or message.
 * @param {CoreSetup['notifications']['toasts']} toastNotifications - The toast notifications service.
 */
export declare const showDataGridColumnChartErrorMessageToast: (e: unknown, toastNotifications: CoreSetup["notifications"]["toasts"]) => void;
/**
 * Helper function to transform { [key]: [val] } => { [key]: val }
 * for when `fields` is used in es.search since response is always an array of values
 * since response always returns an array of values for each field
 *
 * @param {object} originalObj - The original object to get the processed fields from.
 * @param {?(key: string) => boolean} [omitBy] - Optional callback.
 * @returns {boolean) => { [key: string]: any; }}
 */
export declare const getProcessedFields: (originalObj: object, omitBy?: (key: string) => boolean) => {
    [key: string]: any;
};
