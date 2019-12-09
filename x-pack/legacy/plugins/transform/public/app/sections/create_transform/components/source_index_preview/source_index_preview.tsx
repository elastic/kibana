/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiCopy,
  EuiDataGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiTitle,
} from '@elastic/eui';

import { getNestedProperty } from '../../../../../../common/utils/object_utils';

import { useCurrentIndexPattern } from '../../../../lib/kibana';

import { EsFieldName, PivotQuery } from '../../../../common';

import { getSourceIndexDevConsoleStatement } from './common';
import { SOURCE_INDEX_STATUS, useSourceIndexData } from './use_source_index_data';

// EuiDataGrid needs a fixed width on the parent element to provide a horizontal scrollbar.
// Because the overall transform wizard doesn't have a fixed width, we need to calculate it
// based of the overall width of the root element and substract all paddings and margins
// from elements between the root and the EuiDataGrid component.
const defaultPanelWidth = 500;
const panelPadding = 410 + 48 + 16 + 32 + 24 + 12 + 32;

interface SourceIndexPreviewTitle {
  indexPatternTitle: string;
}
const SourceIndexPreviewTitle: React.FC<SourceIndexPreviewTitle> = ({ indexPatternTitle }) => (
  <EuiTitle size="xs">
    <span>
      {i18n.translate('xpack.transform.sourceIndexPreview.sourceIndexPatternTitle', {
        defaultMessage: 'Source index {indexPatternTitle}',
        values: { indexPatternTitle },
      })}
    </span>
  </EuiTitle>
);

interface Props {
  query: PivotQuery;
}

export const SourceIndexPreview: React.FC<Props> = React.memo(({ query }) => {
  const [panelWidth, setPanelWidth] = useState(defaultPanelWidth);

  const resizeHandler = () => {
    const docWidth = document.documentElement.clientWidth;
    const sideBarWidth = (document.getElementById('management-sidenav')?.clientWidth || 192) + 24;
    // TODO This doesn't consider when the document width doesn't change but the nav does yet ...
    const navWidth = document.getElementById('navDrawerMenu')?.clientWidth || 48;
    const nextPanelWidth = docWidth - panelPadding - sideBarWidth - navWidth;
    setPanelWidth(nextPanelWidth);
  };

  useEffect(() => {
    window.addEventListener('resize', resizeHandler);
    resizeHandler();
    return () => {
      window.removeEventListener('resize', resizeHandler);
    };
  }, []);

  const indexPattern = useCurrentIndexPattern();
  const allFields = indexPattern.fields.map(f => f.name);
  const indexPatternFields: string[] = allFields.filter(f => {
    if (indexPattern.metaFields.includes(f)) {
      return false;
    }

    const fieldParts = f.split('.');
    const lastPart = fieldParts.pop();
    if (lastPart === 'keyword' && allFields.includes(fieldParts.join('.'))) {
      return false;
    }

    return true;
  });

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<EsFieldName[]>(indexPatternFields);

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const { errorMessage, status, rowCount, tableItems: data } = useSourceIndexData(
    indexPattern,
    query,
    pagination
  );

  // EuiDataGrid State
  const dataGridColumns = indexPatternFields.map(id => {
    const field = indexPattern.fields.getByName(id);

    let schema = 'string';

    switch (field?.type) {
      case 'date':
        schema = 'datetime';
        break;
      case 'geo_point':
        schema = 'json';
        break;
      case 'number':
        schema = 'numeric';
        break;
    }

    return { id, schema };
  });

  const onChangeItemsPerPage = useCallback(pageSize => setPagination(p => ({ ...p, pageSize })), [
    setPagination,
  ]);

  const onChangePage = useCallback(pageIndex => setPagination(p => ({ ...p, pageIndex })), [
    setPagination,
  ]);

  // ** Sorting config
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(sc => setSortingColumns(sc), [setSortingColumns]);

  const renderCellValue = useMemo(() => {
    return ({
      rowIndex,
      columnId,
      setCellProps,
    }: {
      rowIndex: number;
      columnId: string;
      setCellProps: any;
    }) => {
      const adjustedRowIndex = rowIndex - pagination.pageIndex * pagination.pageSize;

      const cellValue = data.hasOwnProperty(adjustedRowIndex)
        ? getNestedProperty(data[adjustedRowIndex], columnId, null)
        : null;

      if (typeof cellValue === 'object' && cellValue !== null) {
        return JSON.stringify(cellValue);
      }

      if (cellValue === undefined) {
        return null;
      }

      return cellValue;
    };
  }, [data, pagination.pageIndex, pagination.pageSize]);

  if (status === SOURCE_INDEX_STATUS.ERROR) {
    return (
      <EuiPanel grow={false} data-test-subj="transformSourceIndexPreview error">
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate('xpack.transform.sourceIndexPreview.sourceIndexPatternError', {
            defaultMessage: 'An error occurred loading the source index data.',
          })}
          color="danger"
          iconType="cross"
        >
          <EuiCodeBlock language="json" fontSize="s" paddingSize="s" isCopyable>
            {errorMessage}
          </EuiCodeBlock>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  if (status === SOURCE_INDEX_STATUS.LOADED && data.length === 0) {
    return (
      <EuiPanel grow={false} data-test-subj="transformSourceIndexPreview empty">
        <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        <EuiCallOut
          title={i18n.translate(
            'xpack.transform.sourceIndexPreview.SourceIndexNoDataCalloutTitle',
            {
              defaultMessage: 'Empty source index query result.',
            }
          )}
          color="primary"
        >
          <p>
            {i18n.translate('xpack.transform.sourceIndexPreview.SourceIndexNoDataCalloutBody', {
              defaultMessage:
                'The query for the source index returned no results. Please make sure you have sufficient permissions, the index contains documents and your query is not too restrictive.',
            })}
          </p>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  const euiCopyText = i18n.translate('xpack.transform.sourceIndexPreview.copyClipboardTooltip', {
    defaultMessage: 'Copy Dev Console statement of the source index preview to the clipboard.',
  });

  return (
    <EuiPanel
      data-test-subj="transformSourceIndexPreview loaded"
      style={{ width: `${panelWidth}px` }}
    >
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <SourceIndexPreviewTitle indexPatternTitle={indexPattern.title} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiCopy
                beforeMessage={euiCopyText}
                textToCopy={getSourceIndexDevConsoleStatement(query, indexPattern.title)}
              >
                {(copy: () => void) => (
                  <EuiButtonIcon onClick={copy} iconType="copyClipboard" aria-label={euiCopyText} />
                )}
              </EuiCopy>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {status === SOURCE_INDEX_STATUS.LOADING && <EuiProgress size="xs" color="accent" />}
      {status !== SOURCE_INDEX_STATUS.LOADING && (
        <EuiProgress size="xs" color="accent" max={1} value={0} />
      )}
      {dataGridColumns.length > 0 && data.length > 0 && (
        <EuiDataGrid
          aria-label="Source index preview"
          columns={dataGridColumns}
          columnVisibility={{ visibleColumns, setVisibleColumns }}
          gridStyle={{
            border: 'all',
            fontSize: 's',
            cellPadding: 's',
            stripes: true,
            rowHover: 'highlight',
            header: 'shade',
          }}
          rowCount={rowCount}
          renderCellValue={renderCellValue}
          sorting={{ columns: sortingColumns, onSort }}
          toolbarVisibility={{
            showColumnSelector: true,
            showStyleSelector: false,
            showSortSelector: true,
            showFullScreenSelector: true,
          }}
          pagination={{
            ...pagination,
            pageSizeOptions: [5, 10, 25],
            onChangeItemsPerPage,
            onChangePage,
          }}
        />
      )}
    </EuiPanel>
  );
});
