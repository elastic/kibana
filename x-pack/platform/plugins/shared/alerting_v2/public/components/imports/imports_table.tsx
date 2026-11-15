/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiFieldSearch, EuiInMemoryTable, EuiLink, EuiSpacer } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALERTING_V2_EPISODES_STATUS_ALL } from '@kbn/alerting-v2-constants';
import { useAlertingLocators } from '../../application/locator_context';
import type { ImportListItem } from '../../hooks/use_fetch_imports';
import { EMPTY_VALUE } from '../../utils/rule_display';
import {
  IMPORT_ALERT_COUNT_DAYS,
  IMPORT_ALERT_COUNT_TIME_RANGE,
} from '../../queries/imports/import_alert_counts_query';

const CONNECTOR_TYPE_LABELS: Readonly<Record<string, string>> = {
  '.inboundWebhook': i18n.translate('xpack.alertingV2.imports.list.type.customWebhook', {
    defaultMessage: 'Custom webhook',
  }),
  '.datadog': i18n.translate('xpack.alertingV2.imports.list.type.datadog', {
    defaultMessage: 'Datadog',
  }),
};

const getConnectorTypeLabel = (connectorTypeId: string): string =>
  CONNECTOR_TYPE_LABELS[connectorTypeId] ?? connectorTypeId;

/** A list item with its alert series count; the count is absent until it loads. */
interface ImportRow extends ImportListItem {
  alertSeriesCount?: number;
}

/** KQL for the alerts list that matches the alerts one connector created. */
export const getConnectorAlertsQuery = (connectorId: string): string =>
  `connector.id: "${connectorId.replace(/["\\]/g, '\\$&')}"`;

/** The alert count, linked to the alerts list filtered to the connector and the same 30 days. */
const AlertsCountLink = ({ connectorId, count }: { connectorId: string; count?: number }) => {
  const { episodesLocators } = useAlertingLocators();
  if (count === undefined) {
    return <span data-test-subj="importsAlertsCount">{EMPTY_VALUE}</span>;
  }
  if (count === 0) {
    return <span data-test-subj="importsAlertsCount">{count}</span>;
  }
  const params = {
    filters: {
      queryString: getConnectorAlertsQuery(connectorId),
      status: ALERTING_V2_EPISODES_STATUS_ALL,
    },
    timeRange: { ...IMPORT_ALERT_COUNT_TIME_RANGE },
  };
  return (
    <EuiLink
      href={episodesLocators.getRedirectUrl(params)}
      onClick={(event: React.MouseEvent) => {
        event.preventDefault();
        episodesLocators.navigateSync(params);
      }}
      data-test-subj="importsAlertsCount"
    >
      {count}
    </EuiLink>
  );
};

const columns: Array<EuiBasicTableColumn<ImportRow>> = [
  {
    field: 'name',
    name: i18n.translate('xpack.alertingV2.imports.list.column.name', {
      defaultMessage: 'Name',
    }),
    sortable: true,
    truncateText: true,
  },
  {
    field: 'connectorTypeId',
    name: i18n.translate('xpack.alertingV2.imports.list.column.type', {
      defaultMessage: 'Type',
    }),
    sortable: ({ connectorTypeId }: ImportRow) => getConnectorTypeLabel(connectorTypeId),
    render: (connectorTypeId: ImportRow['connectorTypeId']) =>
      getConnectorTypeLabel(connectorTypeId),
  },
  {
    field: 'alertSeriesCount',
    name: i18n.translate('xpack.alertingV2.imports.list.column.alerts', {
      defaultMessage: 'Alerts (last {days} days)',
      values: { days: IMPORT_ALERT_COUNT_DAYS },
    }),
    dataType: 'number',
    sortable: true,
    render: (alertSeriesCount: ImportRow['alertSeriesCount'], { connectorId }: ImportRow) => (
      <AlertsCountLink connectorId={connectorId} count={alertSeriesCount} />
    ),
  },
];

const SEARCH_LABEL = i18n.translate('xpack.alertingV2.imports.list.searchPlaceholder', {
  defaultMessage: 'Search by name',
});

/** Case-insensitive match on the import name. */
export const filterImportsByName = (
  items: readonly ImportListItem[],
  searchText: string
): ImportListItem[] => {
  const needle = searchText.trim().toLowerCase();
  return needle === ''
    ? [...items]
    : items.filter(({ name }) => name.toLowerCase().includes(needle));
};

interface ImportsTableProps {
  items: ImportListItem[];
  isLoading: boolean;
  error?: Error | null;
  /** Alert series count per connector id; undefined while loading or after a failure. */
  alertCounts?: Readonly<Record<string, number>>;
}

/** The imports of the current space, searched by name, sorted and paged in the browser. */
export const ImportsTable = ({ items, isLoading, error, alertCounts }: ImportsTableProps) => {
  const [searchText, setSearchText] = useState('');
  const rows = useMemo(
    (): ImportRow[] =>
      filterImportsByName(items, searchText).map((item) => ({
        ...item,
        // A connector without alerts is absent from the counts.
        alertSeriesCount: alertCounts ? alertCounts[item.connectorId] ?? 0 : undefined,
      })),
    [items, searchText, alertCounts]
  );

  return (
    <>
      <EuiFieldSearch
        fullWidth
        incremental
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder={SEARCH_LABEL}
        aria-label={SEARCH_LABEL}
        data-test-subj="importsListSearch"
      />
      <EuiSpacer size="m" />
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.alertingV2.imports.list.tableCaption', {
          defaultMessage: 'Alert imports',
        })}
        items={rows}
        itemId="connectorId"
        columns={columns}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={{ pageSizeOptions: [10, 25, 50], initialPageSize: 25 }}
        loading={isLoading}
        error={error?.message}
        noItemsMessage={
          searchText.trim() === ''
            ? i18n.translate('xpack.alertingV2.imports.list.noItems', {
                defaultMessage: 'No imports yet. Set up an import to start receiving alerts.',
              })
            : i18n.translate('xpack.alertingV2.imports.list.noMatches', {
                defaultMessage: 'No imports match your search.',
              })
        }
        data-test-subj="importsTable"
      />
    </>
  );
};
