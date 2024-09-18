/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { useMemo } from 'react';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { EuiDataGridCellValueElementProps, EuiDataGridStyle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import { getNestedProperty } from '@kbn/ml-nested-property';
import { isCounterTimeSeriesMetric } from '@kbn/ml-agg-utils';
import { formatHumanReadableDateTimeSeconds } from '@kbn/ml-date-utils';
import {
  type FeatureImportance,
  type FeatureImportanceClassName,
  type TopClasses,
  BASIC_NUMERICAL_TYPES,
  DEFAULT_RESULTS_FIELD,
  EXTENDED_NUMERICAL_TYPES,
  FEATURE_IMPORTANCE,
  FEATURE_INFLUENCE,
  OUTLIER_SCORE,
  TOP_CLASSES,
} from '@kbn/ml-data-frame-analytics-utils';
import { extractErrorMessage, type ErrorType } from '@kbn/ml-error-utils';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';

import type { DataGridItem, IndexPagination, RenderCellValue } from './types';

/**
 * The initial maximum number of columns for the data grid.
 */
export const INIT_MAX_COLUMNS = 10;

/**
 * The default threshold value for the number of rows at which the column chart visibility is set to true.
 */
export const COLUMN_CHART_DEFAULT_VISIBILITY_ROWS_THRESHOLD = 10000;

/**
 * Enum for index status
 */
export enum INDEX_STATUS {
  UNUSED,
  LOADING,
  LOADED,
  ERROR,
}

/**
 * Style configuration for the EuiDataGrid component.
 */
export const euiDataGridStyle: EuiDataGridStyle = {
  border: 'all',
  fontSize: 's',
  cellPadding: 's',
  stripes: false,
  rowHover: 'none',
  header: 'shade',
};

/**
 * Configuration settings for the EuiDataGrid toolbar.
 */
export const euiDataGridToolbarSettings = {
  showColumnSelector: true,
  showDisplaySelector: false,
  showSortSelector: true,
  showFullScreenSelector: false,
};

/**
 * Retrieves fields from a Kibana data view.
 * @param {DataView} dataView - The Kibana data view.
 * @returns {string[]} - The array of field names from the data view.
 */
export const getFieldsFromKibanaDataView = (dataView: DataView): string[] => {
  const allFields = dataView.fields.map((f) => f.name);
  const dataViewFields: string[] = allFields.filter((f) => {
    if (dataView.metaFields.includes(f)) {
      return false;
    }

    const fieldParts = f.split('.');
    const lastPart = fieldParts.pop();
    if (lastPart === 'keyword' && allFields.includes(fieldParts.join('.'))) {
      return false;
    }

    return true;
  });

  return dataViewFields;
};

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
export const getDataGridSchemasFromFieldTypes = (fieldTypes: FieldTypes, resultsField: string) => {
  return Object.keys(fieldTypes).map((field) => {
    // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
    // To fall back to the default string schema it needs to be undefined.
    let schema;
    const isSortable = true;
    const type = fieldTypes[field];

    const isNumber =
      type !== undefined && (BASIC_NUMERICAL_TYPES.has(type) || EXTENDED_NUMERICAL_TYPES.has(type));
    if (isNumber) {
      schema = 'numeric';
    }

    switch (type) {
      case 'date':
        schema = 'datetime';
        break;
      case 'nested':
      case 'geo_point':
        schema = 'json';
        break;
      case 'boolean':
        schema = 'boolean';
        break;
      case 'text':
        schema = NON_AGGREGATABLE;
    }

    if (field === `${resultsField}.${OUTLIER_SCORE}`) {
      schema = 'numeric';
    }

    if (field.includes(`${resultsField}.${TOP_CLASSES}`)) {
      schema = 'json';
    }

    if (field.includes(`${resultsField}.${FEATURE_IMPORTANCE}`)) {
      schema = 'featureImportance';
    }

    if (field === `${resultsField}.${FEATURE_INFLUENCE}`) {
      schema = 'featureInfluence';
    }

    return { id: field, schema, isSortable };
  });
};

export const NON_AGGREGATABLE = 'non-aggregatable';

/**
 * Creates a data grid schema from an ES field type.
 * @param {ES_FIELD_TYPES | undefined | estypes.MappingRuntimeField['type'] | 'number'} fieldType - The ES field type.
 * @returns {string | undefined} - The data grid schema corresponding to the field type.
 */
export const getDataGridSchemaFromESFieldType = (
  fieldType: ES_FIELD_TYPES | undefined | estypes.MappingRuntimeField['type'] | 'number'
): string | undefined => {
  // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
  // To fall back to the default string schema it needs to be undefined.
  let schema;

  switch (fieldType) {
    case ES_FIELD_TYPES.GEO_POINT:
    case ES_FIELD_TYPES.GEO_SHAPE:
      schema = 'json';
      break;
    case ES_FIELD_TYPES.BOOLEAN:
      schema = 'boolean';
      break;
    case ES_FIELD_TYPES.DATE:
    case ES_FIELD_TYPES.DATE_NANOS:
      schema = 'datetime';
      break;
    case ES_FIELD_TYPES.BYTE:
    case ES_FIELD_TYPES.DOUBLE:
    case ES_FIELD_TYPES.FLOAT:
    case ES_FIELD_TYPES.HALF_FLOAT:
    case ES_FIELD_TYPES.INTEGER:
    case ES_FIELD_TYPES.LONG:
    case ES_FIELD_TYPES.SCALED_FLOAT:
    case ES_FIELD_TYPES.SHORT:
    case 'number':
      schema = 'numeric';
      break;
    // keep schema undefined for text based columns
    case ES_FIELD_TYPES.KEYWORD:
    case ES_FIELD_TYPES.VERSION:
    case ES_FIELD_TYPES.TEXT:
      break;
  }

  return schema;
};

/**
 * Retrieves the data grid schema from the Kibana field type.
 * @param {(DataViewField | undefined)} field - The Kibana field object.
 * @returns {(string | undefined)} - The data grid schema corresponding to the field type.
 */
export const getDataGridSchemaFromKibanaFieldType = (
  field: DataViewField | undefined
): string | undefined => {
  // Built-in values are ['boolean', 'currency', 'datetime', 'numeric', 'json']
  // To fall back to the default string schema it needs to be undefined.
  let schema;
  if (!field) return;

  switch (field.type) {
    case KBN_FIELD_TYPES.BOOLEAN:
      schema = 'boolean';
      break;
    case KBN_FIELD_TYPES.DATE:
      schema = 'datetime';
      break;
    case KBN_FIELD_TYPES.GEO_POINT:
    case KBN_FIELD_TYPES.GEO_SHAPE:
      schema = 'json';
      break;
    case KBN_FIELD_TYPES.NUMBER:
      schema = 'numeric';
      break;
    case KBN_FIELD_TYPES.NESTED:
      schema = 'json';
      break;
  }

  if (
    (schema === undefined && field.aggregatable === false) ||
    isCounterTimeSeriesMetric(field) ||
    (schema === 'numeric' &&
      field?.esTypes?.some((d) => d === ES_FIELD_TYPES.AGGREGATE_METRIC_DOUBLE))
  ) {
    return NON_AGGREGATABLE;
  }

  return schema;
};

const getClassName = (className: string, isClassTypeBoolean: boolean) => {
  if (isClassTypeBoolean) {
    return className === 'true';
  }

  return className;
};

/**
 * Helper to transform feature importance fields with arrays back to primitive value
 *
 * @param row - EUI data grid data row
 * @param mlResultsField - Data frame analytics results field
 * @param isClassTypeBoolean - Flag if the class type is boolean
 * @returns nested object structure of feature importance values
 */
export const getFeatureImportance = (
  row: DataGridItem,
  mlResultsField: string,
  isClassTypeBoolean = false
): FeatureImportance[] => {
  const featureImportance: Array<{
    feature_name: string[];
    classes?: Array<{ class_name: FeatureImportanceClassName[]; importance: number[] }>;
    importance?: number | number[];
  }> = row[`${mlResultsField}.feature_importance`];
  if (featureImportance === undefined) return [];

  return featureImportance.map((fi) => ({
    feature_name: Array.isArray(fi.feature_name) ? fi.feature_name[0] : fi.feature_name,
    classes: Array.isArray(fi.classes)
      ? fi.classes.map((c) => {
          const processedClass = getProcessedFields(c);
          return {
            importance: processedClass.importance,
            class_name: getClassName(processedClass.class_name, isClassTypeBoolean),
          };
        })
      : fi.classes,
    importance: Array.isArray(fi.importance) ? fi.importance[0] : fi.importance,
  }));
};

/**
 * Helper to transforms top classes fields with arrays back to original primitive value
 *
 * @param row - EUI data grid data row
 * @param mlResultsField - Data frame analytics results field
 * @returns nested object structure of feature importance values
 */
export const getTopClasses = (row: DataGridItem, mlResultsField: string): TopClasses => {
  const topClasses: Array<{
    class_name: FeatureImportanceClassName[];
    class_probability: number[];
    class_score: number[];
  }> = row[`${mlResultsField}.top_classes`];

  if (topClasses === undefined) return [];
  return topClasses.map((tc) => getProcessedFields(tc)) as TopClasses;
};

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
export const useRenderCellValue = (
  dataView: DataView | undefined,
  pagination: IndexPagination,
  tableItems: DataGridItem[],
  resultsField?: string,
  cellPropsCallback?: (
    columnId: string,
    cellValue: any,
    fullItem: DataGridItem,
    setCellProps: EuiDataGridCellValueElementProps['setCellProps']
  ) => void
): RenderCellValue => {
  const renderCellValue: RenderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: EuiDataGridCellValueElementProps['setCellProps'];
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const fullItem = tableItems[adjustedRowIndex];

      if (fullItem === undefined) {
        return null;
      }

      if (dataView === undefined) {
        return null;
      }

      const field = dataView.fields.getByName(columnId);
      let fieldFormat: FieldFormat | undefined;

      if (field !== undefined) {
        fieldFormat = dataView.getFormatterForField(field);
      }

      function getCellValue(cId: string) {
        if (Object.hasOwn(tableItems, adjustedRowIndex)) {
          const item = tableItems[adjustedRowIndex];

          // Try if the field name is available as is.
          if (Object.hasOwn(item, cId)) {
            return item[cId];
          }

          // For classification and regression results, we need to treat some fields with a custom transform.
          if (cId === `${resultsField}.feature_importance`) {
            return getFeatureImportance(fullItem, resultsField ?? DEFAULT_RESULTS_FIELD);
          }

          if (cId === `${resultsField}.top_classes`) {
            return getTopClasses(fullItem, resultsField ?? DEFAULT_RESULTS_FIELD);
          }

          // Try if the field name is available as a nested field.
          return getNestedProperty(tableItems[adjustedRowIndex], cId, null);
        }

        return null;
      }

      const cellValue = getCellValue(columnId);

      if (typeof cellPropsCallback === 'function') {
        cellPropsCallback(columnId, cellValue, fullItem, setCellProps);
      }

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined || cellValue === null) {
        return null;
      }

      if (fieldFormat !== undefined) {
        return fieldFormat.convert(cellValue, 'text');
      }

      if (typeof cellValue === 'string' || cellValue === null) {
        return cellValue;
      }

      if (field?.type === KBN_FIELD_TYPES.DATE) {
        return formatHumanReadableDateTimeSeconds(moment(cellValue).unix() * 1000);
      }

      if (typeof cellValue === 'boolean') {
        return cellValue ? 'true' : 'false';
      }

      return cellValue;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataView?.fields, pagination.pageIndex, pagination.pageSize, tableItems]);
  return renderCellValue;
};

/**
 * Value can be nested or the fieldName itself might contain other special characters like `.`
 * @param {unknown} obj - The object to get the nested property from.
 * @param {string} sortId - The sort id attribute.
 * @returns {*}
 */
export const getNestedOrEscapedVal = (obj: unknown, sortId: string) => {
  if (isPopulatedObject(obj, [sortId])) {
    return getNestedProperty(obj, sortId, null) ?? obj[sortId];
  }
};

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
export const multiColumnSortFactory = (sortingColumns: MultiColumnSorter[]) => {
  const sortFn = (a: any, b: any, sortingColumnIndex = 0): number => {
    const sort = sortingColumns[sortingColumnIndex];

    // Value can be nested or the fieldName itself might contain `.`
    let aValue = getNestedOrEscapedVal(a, sort.id);
    let bValue = getNestedOrEscapedVal(b, sort.id);

    if (sort.type === 'number') {
      aValue = aValue ?? 0;
      bValue = bValue ?? 0;
      if (aValue < bValue) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (sort.type === 'string') {
      aValue = aValue ?? '';
      bValue = bValue ?? '';

      if (aValue.localeCompare(bValue) === -1) {
        return sort.direction === 'asc' ? -1 : 1;
      }
      if (aValue.localeCompare(bValue) === 1) {
        return sort.direction === 'asc' ? 1 : -1;
      }
    }

    if (sortingColumnIndex + 1 < sortingColumns.length) {
      return sortFn(a, b, sortingColumnIndex + 1);
    }

    return 0;
  };

  return sortFn;
};

/**
 * Displays an error toast message for the data grid column chart.
 *
 * @param {unknown} e - The error object or message.
 * @param {CoreSetup['notifications']['toasts']} toastNotifications - The toast notifications service.
 */
export const showDataGridColumnChartErrorMessageToast = (
  e: unknown,
  toastNotifications: CoreSetup['notifications']['toasts']
) => {
  toastNotifications.addDanger(
    i18n.translate('xpack.ml.dataGrid.columnChart.ErrorMessageToast', {
      defaultMessage: 'An error occurred fetching the histogram charts data: {error}',
      values: { error: extractErrorMessage(e as ErrorType) },
    })
  );
};

/**
 * Helper function to transform { [key]: [val] } => { [key]: val }
 * for when `fields` is used in es.search since response is always an array of values
 * since response always returns an array of values for each field
 *
 * @param {object} originalObj - The original object to get the processed fields from.
 * @param {?(key: string) => boolean} [omitBy] - Optional callback.
 * @returns {boolean) => { [key: string]: any; }}
 */
export const getProcessedFields = (originalObj: object, omitBy?: (key: string) => boolean) => {
  const obj: { [key: string]: any } = { ...originalObj };
  for (const key of Object.keys(obj)) {
    // if no conditional is included, process everything
    if (omitBy === undefined) {
      if (Array.isArray(obj[key]) && obj[key].length === 1) {
        obj[key] = obj[key][0];
      }
    } else {
      // else only process the fields for things users don't want to omit
      if (omitBy(key) === false)
        if (Array.isArray(obj[key]) && obj[key].length === 1) {
          obj[key] = obj[key][0];
        }
    }
  }
  return obj;
};
