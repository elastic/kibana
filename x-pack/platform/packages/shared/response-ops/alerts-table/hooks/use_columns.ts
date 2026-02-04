/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo } from 'react';
import type { EuiDataGridColumn, EuiDataGridOnColumnResizeData } from '@elastic/eui';
import type { BrowserField, BrowserFields } from '@kbn/alerting-types';
import { isEmpty } from 'lodash';
import { ALERT_CASE_IDS, ALERT_MAINTENANCE_WINDOW_IDS } from '@kbn/rule-data-utils';
import { createKbnFieldTypes } from '@kbn/field-types/src/kbn_field_types_factory';
import { toggleColumn, toggleVisibleColumn } from '../utils/toggle_column';
import * as i18n from '../translations';

const registeredKbnTypes = createKbnFieldTypes();

const fieldTypeToDataGridColumnTypeMapper = (fieldType: string | undefined) => {
  if (fieldType === 'date') return 'datetime';
  if (fieldType === 'number') return 'numeric';
  if (fieldType === 'object') return 'json';
  return fieldType;
};

const getFieldCategoryFromColumnId = (columnId: string): string => {
  const fieldName = columnId.split('.');

  if (fieldName.length === 1) {
    return 'base';
  }

  return fieldName[0];
};

const formatSystemColumn = (column: EuiDataGridColumn): EuiDataGridColumn => {
  const newColumn = { ...column };

  if (newColumn.id === ALERT_CASE_IDS) {
    newColumn.isSortable = false;

    // Don't override display text to allow for customizations
    if (!newColumn.displayAsText) {
      newColumn.displayAsText = i18n.CASES;
    }
  }

  if (newColumn.id === ALERT_MAINTENANCE_WINDOW_IDS) {
    newColumn.isSortable = false;

    if (!newColumn.displayAsText) {
      newColumn.displayAsText = i18n.MAINTENANCE_WINDOWS;
    }
  }

  return newColumn;
};

/**
 * EUI Data Grid expects the columns to have a property 'schema' defined for proper sorting
 * this schema as its own types as can be check out in the docs so we add it here manually
 * https://eui.elastic.co/#/tabular-content/data-grid-schema-columns
 */
const euiColumnFactory = (
  columnId: string,
  browserFields: BrowserFields,
  defaultColumns: EuiDataGridColumn[]
): EuiDataGridColumn => {
  const defaultColumn = getColumnByColumnId(defaultColumns, columnId);
  const column = formatSystemColumn(defaultColumn ? defaultColumn : { id: columnId });

  const browserFieldsProps = getBrowserFieldProps(columnId, browserFields);

  const sortingData = registeredKbnTypes.find((t) => t.name === browserFieldsProps?.type);
  return {
    ...column,
    isSortable: (sortingData?.sortable && browserFieldsProps?.aggregatable) ?? false,
    schema: fieldTypeToDataGridColumnTypeMapper(browserFieldsProps.type),
  };
};

const getBrowserFieldProps = (
  columnId: string,
  browserFields: BrowserFields
): Partial<BrowserField> => {
  const notFoundSpecs = { type: 'string' };

  if (!browserFields || Object.keys(browserFields).length === 0) {
    return notFoundSpecs;
  }

  const category = getFieldCategoryFromColumnId(columnId);
  if (!browserFields[category]) {
    return notFoundSpecs;
  }

  const categorySpecs = browserFields[category].fields;
  if (!categorySpecs) {
    return notFoundSpecs;
  }

  const fieldSpecs = categorySpecs[columnId];
  return fieldSpecs ? fieldSpecs : notFoundSpecs;
};

const isPopulatedColumn = (column: EuiDataGridColumn) => Boolean(column.schema);

const populateColumns = (
  /**
   * Columns to be augmented with fields data
   */
  columns: EuiDataGridColumn[],
  /**
   * Alert field specs
   */
  browserFields: BrowserFields,
  /**
   * Default columns configuration
   */
  defaultColumns: EuiDataGridColumn[]
): EuiDataGridColumn[] => {
  return columns.map((column: EuiDataGridColumn) => {
    return isPopulatedColumn(column)
      ? column
      : euiColumnFactory(column.id, browserFields, defaultColumns);
  });
};

const getColumnByColumnId = (columns: EuiDataGridColumn[], columnId: string) => {
  return columns.find(({ id }: { id: string }) => id === columnId);
};

export interface UseColumnsArgs {
  columns: EuiDataGridColumn[];
  updateColumns: Dispatch<SetStateAction<EuiDataGridColumn[]>>;
  defaultColumns: EuiDataGridColumn[];
  visibleColumns: string[];
  updateVisibleColumns: Dispatch<SetStateAction<string[]>>;
  defaultVisibleColumns: string[];
  alertsFields?: BrowserFields;
}

export interface UseColumnsResp {
  columnsWithFieldsData: EuiDataGridColumn[];
  onResetColumns: () => void;
  onToggleColumn: (columnId: string) => void;
  onColumnResize: (args: EuiDataGridOnColumnResizeData) => void;
  fields: Array<{
    field: string;
    include_unmapped: boolean;
  }>;
}

export const useColumns = ({
  columns,
  updateColumns,
  defaultColumns,
  visibleColumns,
  updateVisibleColumns,
  defaultVisibleColumns,
  alertsFields,
}: UseColumnsArgs): UseColumnsResp => {
  const columnsWithFieldsData = useMemo(() => {
    const populatedColumns = isEmpty(alertsFields)
      ? columns
      : populateColumns(columns, alertsFields, columns);
    const lastVisibleColumn = visibleColumns[visibleColumns.length - 1];
    return populatedColumns.map((col) => {
      if (col.id !== lastVisibleColumn) {
        return col;
      }

      const { initialWidth, ...rest } = col;
      return rest;
    });
  }, [columns, alertsFields, visibleColumns]);

  const onResetColumns = useCallback(() => {
    updateColumns(defaultColumns);
    updateVisibleColumns(defaultColumns.map((col) => col.id));
  }, [defaultColumns, updateColumns, updateVisibleColumns]);

  const onToggleColumn = useCallback(
    (columnId: string) => {
      updateColumns((oldColumns) => {
        const updatedColumns = toggleColumn({
          columnId,
          columns: oldColumns,
          defaultColumns,
        });

        // Toggle the column in the visible columns as well
        updateVisibleColumns((oldVisibleColumns) =>
          toggleVisibleColumn({
            columnId,
            visibleColumns: oldVisibleColumns,
            defaultVisibleColumns,
            columns: updatedColumns,
          })
        );

        return updatedColumns;
      });
    },
    [updateColumns, updateVisibleColumns, defaultColumns, defaultVisibleColumns]
  );

  const onColumnResize = useCallback(
    ({ columnId, width }: EuiDataGridOnColumnResizeData) => {
      updateColumns((oldColumns) =>
        oldColumns.map((col) => (col.id === columnId ? { ...col, initialWidth: width } : col))
      );
    },
    [updateColumns]
  );

  const fieldsToFetch = useMemo(
    () => [...columns.map((col) => ({ field: col.id, include_unmapped: true }))],
    [columns]
  );

  return {
    columnsWithFieldsData,
    onResetColumns,
    onToggleColumn,
    onColumnResize,
    fields: fieldsToFetch,
  };
};
