/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBasicTable, EuiBasicTableColumn, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { DataGridDensity, ROWS_HEIGHT_OPTIONS } from '@kbn/unified-data-table';
import moment from 'moment';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { CoreStart } from '@kbn/core-lifecycle-browser';
import { getLogLevelBadgeCell, LazySummaryColumn } from '@kbn/discover-contextual-components';
import type { LogCategoryDocument } from '../../services/category_details_service/types';
import { type ResolvedIndexNameLogsSourceConfiguration } from '../../utils/logs_source';

export interface LogCategoryDocumentExamplesTableDependencies {
  core: CoreStart;
  uiSettings: SettingsStart;
  fieldFormats: FieldFormatsStart;
  share: SharePluginStart;
}

export interface LogCategoryDocumentExamplesTableProps {
  dependencies: LogCategoryDocumentExamplesTableDependencies;
  categoryDocuments: LogCategoryDocument[];
  logsSource: ResolvedIndexNameLogsSourceConfiguration;
}

const TimestampCell = ({
  dependencies,
  timestamp,
}: {
  dependencies: LogCategoryDocumentExamplesTableDependencies;
  timestamp?: string | number;
}) => {
  const dateFormat = useMemo(
    () => dependencies.uiSettings.client.get('dateFormat'),
    [dependencies.uiSettings.client]
  );
  if (!timestamp) return null;

  if (dateFormat) {
    return <>{moment(timestamp).format(dateFormat)}</>;
  } else {
    return <>{timestamp}</>;
  }
};

const LogLevelBadgeCell = getLogLevelBadgeCell('log.level');

export const LogCategoryDocumentExamplesTable: React.FC<LogCategoryDocumentExamplesTableProps> = ({
  categoryDocuments,
  dependencies,
  logsSource,
}) => {
  const columns: Array<EuiBasicTableColumn<LogCategoryDocument>> = [
    {
      field: 'row',
      name: 'Timestamp',
      width: '25%',
      render: (row: any) => {
        return (
          <TimestampCell
            dependencies={dependencies}
            timestamp={row.raw[logsSource.timestampField]}
          />
        );
      },
    },
    {
      field: 'row',
      name: 'Log level',
      width: '10%',
      render: (row: any) => {
        return (
          <LogLevelBadgeCell
            rowIndex={0}
            colIndex={0}
            columnId="row"
            isExpandable={true}
            isExpanded={false}
            isDetails={false}
            row={row}
            dataView={logsSource.dataView}
            fieldFormats={dependencies.fieldFormats}
            setCellProps={() => {}}
            closePopover={() => {}}
          />
        );
      },
    },
    {
      field: 'row',
      name: 'Summary',
      width: '65%',
      render: (row: any) => {
        return (
          <LazySummaryColumn
            rowIndex={0}
            colIndex={0}
            columnId="_source"
            isExpandable={true}
            isExpanded={false}
            isDetails={false}
            row={row}
            dataView={logsSource.dataView}
            fieldFormats={dependencies.fieldFormats}
            setCellProps={() => {}}
            closePopover={() => {}}
            density={DataGridDensity.COMPACT}
            rowHeight={ROWS_HEIGHT_OPTIONS.single}
            shouldShowFieldHandler={() => false}
            core={dependencies.core}
            share={dependencies.share}
          />
        );
      },
    },
  ];
  return (
    <>
      <EuiText size="xs" color="subdued">
        {i18n.translate(
          'xpack.observabilityLogsOverview.logCategoryDocumentExamplesTable.documentCountText',
          {
            defaultMessage: 'Displaying the latest {documentsCount} documents.',
            values: {
              documentsCount: categoryDocuments.length,
            },
          }
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable
        tableCaption={i18n.translate(
          'xpack.observabilityLogsOverview.logCategoryDocumentExamplesTable.tableCaption',
          {
            defaultMessage: 'Log category example documents table',
          }
        )}
        items={categoryDocuments}
        columns={columns}
      />
    </>
  );
};
