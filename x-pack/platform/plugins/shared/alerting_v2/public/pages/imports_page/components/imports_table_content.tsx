/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Query } from '@elastic/eui';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
  SelectableFilterPopover,
  StandardFilterOption,
} from '@kbn/content-list';
import type { ContentListItem } from '@kbn/content-list';
import { useContentListItems, useContentListState } from '@kbn/content-list-provider';
import { filter } from '@kbn/content-list-toolbar';
import { ALERTING_V2_EPISODES_STATUS_ALL } from '@kbn/alerting-v2-constants';
import { useAlertingLocators } from '../../../application/locator_context';
import { ImportActionsMenu } from '../../../components/imports/import_actions_menu';
import { ImportDetailsFlyout } from '../../../components/imports/import_details_flyout';
import {
  ImportStatusHealth,
  IMPORT_STATUS_META,
  IMPORT_STATUS_ORDER,
} from '../../../components/imports/import_status';
import { formatRelativeTime } from '../../../components/imports/format_import_time';
import {
  ImportKindIcon,
  isManagedImport,
  useImportKindLabel,
} from '../../../components/imports/import_kind';
import { IMPORT_STATUS_FILTER_ID, isImportContentListItem } from '../imports_data_source';
import type { ImportListItem } from '../imports_data_source';

const { Column } = ContentListTable;

const EMPTY_VALUE = '-';

export const IMPORT_STATUS_FILTER_OPTIONS = IMPORT_STATUS_ORDER.map((status) => ({
  key: status,
  label: IMPORT_STATUS_META[status].label,
}));

const STATUS_FILTER_TITLE = i18n.translate('xpack.alertingV2.imports.filter.status.title', {
  defaultMessage: 'Status',
});

interface Props {
  canWrite: boolean;
  /** The import whose state is changing right now, so its row can show it. */
  changingImportId?: string;
  isChangingState: boolean;
  onToggleEnabled: (item: ImportListItem) => void;
  onRequestDelete: (item: ImportListItem) => void;
}

const toImportItem = (item: ContentListItem): ImportListItem | undefined =>
  isImportContentListItem(item) ? item.importItem : undefined;

const ImportNameCell = ({
  importItem,
  onOpen,
}: {
  importItem: ImportListItem;
  onOpen: () => void;
}) => {
  const kindLabel = useImportKindLabel(importItem.import);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <ImportKindIcon config={importItem.import} size="l" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="none">
          <EuiFlexItem>
            <EuiLink onClick={onOpen} data-test-subj={`importsNameLink-${importItem.import.id}`}>
              {importItem.import.name}
            </EuiLink>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued" data-test-subj="importsKindLabel">
              {kindLabel}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const AlertsCountLink = ({ item }: { item: ImportListItem }) => {
  const { episodesLocators } = useAlertingLocators();
  const count = item.stats?.alert_series_count;
  if (count === undefined) {
    return <>{EMPTY_VALUE}</>;
  }
  if (count === 0) {
    return <span data-test-subj="importsAlertsCount">{count}</span>;
  }
  return (
    <EuiLink
      onClick={() =>
        episodesLocators.navigateSync({
          filters: { ruleId: item.import.id, status: ALERTING_V2_EPISODES_STATUS_ALL },
        })
      }
      data-test-subj="importsAlertsCount"
    >
      {count}
    </EuiLink>
  );
};

export const ImportsTableContent = ({
  canWrite,
  changingImportId,
  isChangingState,
  onToggleEnabled,
  onRequestDelete,
}: Props) => {
  const [importToViewId, setImportToViewId] = useState<string | null>(null);
  const { items } = useContentListItems();
  const { refetch } = useContentListState();

  const importToView = useMemo(
    () =>
      importToViewId
        ? items.map(toImportItem).find((candidate) => candidate?.import.id === importToViewId)
        : undefined,
    [importToViewId, items]
  );

  return (
    <>
      <ContentListToolbar>
        <ContentListToolbar.Filters>
          <StatusFilter />
        </ContentListToolbar.Filters>
      </ContentListToolbar>
      <ContentListTable
        title={i18n.translate('xpack.alertingV2.imports.table.title', {
          defaultMessage: 'Imports',
        })}
        scrollableInline
        responsiveBreakpoint={false}
      >
        <Column
          id="name"
          name={i18n.translate('xpack.alertingV2.imports.column.name', {
            defaultMessage: 'Name',
          })}
          width="24em"
          minWidth="16em"
          data-test-subj="importsColumnName"
          render={(item) => {
            const importItem = toImportItem(item);
            if (!importItem) {
              return null;
            }
            return (
              <ImportNameCell
                importItem={importItem}
                onOpen={() => setImportToViewId(importItem.import.id)}
              />
            );
          }}
        />
        <Column
          id="status"
          name={i18n.translate('xpack.alertingV2.imports.column.status', {
            defaultMessage: 'Status',
          })}
          width="200px"
          render={(item) => {
            const importItem = toImportItem(item);
            return importItem?.stats ? (
              <ImportStatusHealth status={importItem.stats.status} />
            ) : (
              EMPTY_VALUE
            );
          }}
        />
        <Column
          id="lastAlert"
          name={i18n.translate('xpack.alertingV2.imports.column.lastAlert', {
            defaultMessage: 'Last alert',
          })}
          width="170px"
          render={(item) => {
            const importItem = toImportItem(item);
            return formatRelativeTime(importItem?.stats?.last_alert_at) ?? EMPTY_VALUE;
          }}
        />
        <Column
          id="alerts"
          name={i18n.translate('xpack.alertingV2.imports.column.alerts', {
            defaultMessage: 'Alerts',
          })}
          width="90px"
          render={(item) => {
            const importItem = toImportItem(item);
            return importItem ? <AlertsCountLink item={importItem} /> : null;
          }}
        />
        <Column
          id="tags"
          name={i18n.translate('xpack.alertingV2.imports.column.tags', {
            defaultMessage: 'Tags',
          })}
          render={(item) => {
            const tags = toImportItem(item)?.import.tags ?? [];
            if (tags.length === 0) {
              return EMPTY_VALUE;
            }
            return (
              <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                {tags.map((tag) => (
                  <EuiFlexItem grow={false} key={tag}>
                    <EuiBadge color="hollow">{tag}</EuiBadge>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            );
          }}
        />
        <Column
          id="actions"
          name={i18n.translate('xpack.alertingV2.imports.column.actions', {
            defaultMessage: 'Actions',
          })}
          width="80px"
          render={(item) => {
            const importItem = toImportItem(item);
            if (!importItem) {
              return null;
            }
            return (
              <ImportActionsMenu
                importId={importItem.import.id}
                importName={importItem.import.name}
                enabled={importItem.import.enabled}
                isManaged={isManagedImport(importItem.import)}
                canWrite={canWrite}
                isDisabled={isChangingState && changingImportId === importItem.import.id}
                onViewDetails={() => setImportToViewId(importItem.import.id)}
                onToggleEnabled={() => onToggleEnabled(importItem)}
                onDelete={() => onRequestDelete(importItem)}
              />
            );
          }}
        />
      </ContentListTable>
      <ContentListFooter />
      {importToView && (
        <ImportDetailsFlyout
          item={importToView}
          canWrite={canWrite}
          isStateLoading={isChangingState && changingImportId === importToView.import.id}
          onClose={() => setImportToViewId(null)}
          onToggleEnabled={onToggleEnabled}
          onRequestDelete={(importItem) => {
            setImportToViewId(null);
            onRequestDelete(importItem);
          }}
          onRefresh={refetch}
        />
      )}
    </>
  );
};

const StatusFilterComponent = ({
  query,
  onChange,
}: {
  query?: Query;
  onChange?: (query: Query) => void;
}) => (
  <SelectableFilterPopover
    fieldName={IMPORT_STATUS_FILTER_ID}
    title={STATUS_FILTER_TITLE}
    query={query}
    onChange={onChange}
    options={IMPORT_STATUS_FILTER_OPTIONS}
    renderOption={(option, { isActive }) => (
      <StandardFilterOption isActive={isActive}>{option.label}</StandardFilterOption>
    )}
    singleSelection
    hideSearch
    data-test-subj="importsStatusFilter"
  />
);

const StatusFilter = filter.createComponent({
  resolve: () => ({
    type: 'custom_component' as const,
    component: StatusFilterComponent,
  }),
});
