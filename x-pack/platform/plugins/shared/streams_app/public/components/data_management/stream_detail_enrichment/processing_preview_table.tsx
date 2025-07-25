/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiDataGridControlColumn,
  EuiDataGridProps,
  EuiDataGridRowHeightsOptions,
  EuiFlexGroup,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SampleDocument } from '@kbn/streams-schema';
import React, { useMemo } from 'react';
import {
  SampleDocumentWithUIAttributes,
  SimulationContext,
} from './state_management/simulation_state_machine';
import { PreviewTable } from '../preview_table';
import { DATA_SOURCES_I18N } from './data_sources_flyout/translations';
import { EnrichmentDataSourceWithUIAttributes } from './types';
import { useDataSourceSelectorById } from './state_management/data_source_state_machine/use_data_source_selector';

export function ProcessingPreviewTable({
  selectedRowIndex,
  onRowSelected,
  showRowSourceAvatars,
  originalSamples,
  ...otherProps
}: {
  documents: SampleDocument[];
  originalSamples?: SampleDocumentWithUIAttributes[];
  displayColumns?: string[];
  height?: EuiDataGridProps['height'];
  renderCellValue?: (doc: SampleDocument, columnId: string) => React.ReactNode | undefined;
  rowHeightsOptions?: EuiDataGridRowHeightsOptions;
  toolbarVisibility?: boolean;
  setVisibleColumns?: (visibleColumns: string[]) => void;
  columnOrderHint?: string[];
  sorting?: SimulationContext['previewColumnsSorting'];
  setSorting?: (sorting: SimulationContext['previewColumnsSorting']) => void;
  selectedRowIndex?: number;
  onRowSelected?: (selectedRowIndex: number) => void;
  showRowSourceAvatars: boolean;
}) {
  const leadingControlColumns: EuiDataGridControlColumn[] = useMemo(
    () => [
      {
        id: 'selection',
        width: showRowSourceAvatars ? 72 : 36,
        headerCellRender: () => null,
        rowCellRender: ({ rowIndex }) => {
          const originalSample = originalSamples?.[rowIndex];
          return (
            <EuiFlexGroup gutterSize="s">
              <EuiButtonIcon
                onClick={() => {
                  if (onRowSelected) {
                    onRowSelected(rowIndex);
                  }
                }}
                aria-label={i18n.translate(
                  'xpack.streams.resultPanel.euiDataGrid.preview.selectRowAriaLabel',
                  {
                    defaultMessage: 'Select row {rowIndex}',
                    values: { rowIndex: rowIndex + 1 },
                  }
                )}
                iconType={selectedRowIndex === rowIndex ? 'minimize' : 'expand'}
                color={selectedRowIndex === rowIndex ? 'primary' : 'text'}
              />
              {showRowSourceAvatars && originalSample && (
                <RowSourceAvatar originalSample={originalSample} />
              )}
            </EuiFlexGroup>
          );
        },
      },
    ],
    [onRowSelected, showRowSourceAvatars, selectedRowIndex, originalSamples]
  );

  return <PreviewTable {...otherProps} leadingControlColumns={leadingControlColumns} />;
}

function dataSourceTypeToI18nKey(type: EnrichmentDataSourceWithUIAttributes['type']) {
  switch (type) {
    case 'random-samples':
      return 'randomSamples';
    case 'kql-samples':
      return 'kqlDataSource';
    case 'custom-samples':
      return 'customSamples';
  }
}

function RowSourceAvatar({ originalSample }: { originalSample: SampleDocumentWithUIAttributes }) {
  const dataSourceContext = useDataSourceSelectorById(
    originalSample.dataSourceId,
    (snapshot) => snapshot?.context
  );
  if (!dataSourceContext) {
    // If the data source context is not available, we cannot render the avatar
    return null;
  }
  const {
    uiAttributes: { color },
    dataSource: { type: dataSourceType, name: rawDataSourceName },
  } = dataSourceContext;
  const name =
    rawDataSourceName || DATA_SOURCES_I18N[dataSourceTypeToI18nKey(dataSourceType)].placeholderName;
  return (
    <EuiToolTip content={name}>
      <EuiAvatar size="s" color={color} initialsLength={1} name={name} />
    </EuiToolTip>
  );
}
