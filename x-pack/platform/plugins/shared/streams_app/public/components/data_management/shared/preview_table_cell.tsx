/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiDataGridRowHeightsOptions, EuiDataGridSetCellProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SampleDocument } from '@kbn/streams-schema';
import type {
  IgnoredField,
  DocumentWithIgnoredFields,
} from '@kbn/streams-schema/src/shared/record_types';
import { LazySummaryColumn } from '@kbn/discover-contextual-components';
import { DataGridDensity, ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import React, { useContext, memo, useEffect } from 'react';
import type { CoreStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { RowSelectionContext, SUMMARY_COLUMN_ID } from './preview_table';
import type { PreviewTableMode } from './preview_table';

const emptyCell = <>&nbsp;</>;
const EMPTY_IGNORED_FIELDS: IgnoredField[] = [];

export function isDocumentWithIgnoredFields(
  doc: SampleDocument | DocumentWithIgnoredFields
): doc is DocumentWithIgnoredFields {
  return 'ignored_fields' in doc && Array.isArray(doc.ignored_fields);
}

interface CellRenderBaseProps {
  rowIndex: number;
  columnId: string;
  setCellProps: (props: EuiDataGridSetCellProps) => void;
  isDetails: boolean;
  isExpanded: boolean;
  isExpandable: boolean;
  colIndex: number;
  mode: PreviewTableMode;
  dataView?: DataView;
  currentRowHeights?: EuiDataGridRowHeightsOptions;
  renderCellValue?: (
    doc: SampleDocument,
    columnId: string,
    ignoredFields?: IgnoredField[]
  ) => React.ReactNode | undefined;
  core: CoreStart;
  share: SharePluginStart;
  fieldFormats: FieldFormatsStart;
}

interface PreviewTableCellContentProps extends CellRenderBaseProps {
  document: SampleDocument;
  ignoredFields: IgnoredField[];
}

const PreviewTableCellContent = memo(function PreviewTableCellContent({
  rowIndex,
  columnId,
  setCellProps,
  isDetails,
  isExpanded,
  isExpandable,
  colIndex,
  document,
  ignoredFields,
  mode,
  dataView,
  currentRowHeights,
  renderCellValue,
  core,
  share,
  fieldFormats,
}: PreviewTableCellContentProps) {
  // Special rendering for summary column
  if (columnId === SUMMARY_COLUMN_ID && mode === 'summary' && dataView) {
    // Convert to DataTableRecord format expected by SummaryColumn
    // No normalization - pass documents as-is with OTel fields
    // The kbn-discover-utils will handle OTel field fallbacks
    const dataTableRecord = {
      raw: document,
      flattened: document,
      id: `${rowIndex}-summary`,
    };

    let rowHeight: number | undefined;
    if (currentRowHeights) {
      const { defaultHeight } = currentRowHeights;
      if (defaultHeight === 'auto') {
        rowHeight = ROWS_HEIGHT_OPTIONS.auto;
      } else if (
        defaultHeight &&
        typeof defaultHeight === 'object' &&
        'lineCount' in defaultHeight &&
        defaultHeight.lineCount
      ) {
        rowHeight = defaultHeight.lineCount;
      }
    }

    return (
      <LazySummaryColumn
        dataView={dataView}
        row={dataTableRecord}
        rowIndex={rowIndex}
        columnId={columnId}
        isDetails={isDetails}
        setCellProps={setCellProps}
        isExpandable={isExpandable}
        isExpanded={isExpanded}
        colIndex={colIndex}
        closePopover={() => {}}
        density={DataGridDensity.COMPACT}
        rowHeight={rowHeight}
        shouldShowFieldHandler={() => true}
        core={core}
        share={share}
        fieldFormats={fieldFormats}
      />
    );
  }

  if (renderCellValue) {
    const renderedValue = renderCellValue(document, columnId, ignoredFields);
    if (renderedValue !== undefined) {
      return renderedValue;
    }
  }

  const value = document[columnId];
  if (value === undefined || value === null) {
    return emptyCell;
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value) || emptyCell;
});

interface PreviewTableCellProps extends CellRenderBaseProps {
  documents: SampleDocument[] | DocumentWithIgnoredFields[];
}

export function PreviewTableCell({
  rowIndex,
  columnId,
  setCellProps,
  isDetails,
  isExpanded,
  isExpandable,
  colIndex,
  documents,
  mode,
  dataView,
  currentRowHeights,
  renderCellValue,
  core,
  share,
  fieldFormats,
}: PreviewTableCellProps) {
  const { euiTheme: theme } = useEuiTheme();
  const { selectedRowIndex } = useContext(RowSelectionContext);
  const isSelected = selectedRowIndex === rowIndex;

  useEffect(() => {
    if (isSelected) {
      setCellProps({
        style: {
          backgroundColor: theme.colors.highlight,
        },
      });
    } else {
      setCellProps({
        style: {},
      });
    }
  }, [isSelected, setCellProps, theme.colors.highlight]);

  const doc = documents[rowIndex];
  const document = isDocumentWithIgnoredFields(doc) ? doc.values : doc;
  const ignoredFields = isDocumentWithIgnoredFields(doc)
    ? doc.ignored_fields
    : EMPTY_IGNORED_FIELDS;

  if (!document || typeof document !== 'object') {
    return emptyCell;
  }

  // Memoized content rendering
  return (
    <PreviewTableCellContent
      rowIndex={rowIndex}
      columnId={columnId}
      setCellProps={setCellProps}
      isDetails={isDetails}
      isExpanded={isExpanded}
      isExpandable={isExpandable}
      colIndex={colIndex}
      document={document}
      ignoredFields={ignoredFields}
      mode={mode}
      dataView={dataView}
      currentRowHeights={currentRowHeights}
      renderCellValue={renderCellValue}
      core={core}
      share={share}
      fieldFormats={fieldFormats}
    />
  );
}
