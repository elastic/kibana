/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiTableFieldDataColumnType,
  EuiText,
  EuiTextBlockTruncate,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { noneValueLabel } from '../../../utils/ki_display';
import { useNavigation } from '../../../hooks/use_navigation';
import { usePrefetchKi } from '../../../hooks/use_prefetch_ki';
import { getViewKiPath } from '../../../paths';
import { KiFormattedDate } from '../shared/ki_formatted_date';
import { KiLifecycleStatusBadge } from '../shared/ki_lifecycle_status_badge';
import { KiTypeDisplay } from '../shared/ki_type_display';
import { getKiDisplayTitle } from './list_ki_helpers';

interface ListKiTableRow extends KiListItem {
  rowKey: string;
}

interface ListKiTableProps {
  aiIndexId: string;
  kis: KiListItem[];
  isRefetching?: boolean;
}

const toTableRow = (ki: KiListItem): ListKiTableRow => ({
  ...ki,
  rowKey: `${ki.index}:${ki.id}`,
});

export const ListKiTable = ({ aiIndexId, kis, isRefetching = false }: ListKiTableProps) => {
  const { navigateToContextEngine } = useNavigation();
  const prefetchKi = usePrefetchKi(aiIndexId);

  const items = useMemo(() => kis.map(toTableRow), [kis]);

  const columns = useMemo((): Array<EuiTableFieldDataColumnType<ListKiTableRow>> => {
    return [
      {
        field: 'title',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnTitle', {
          defaultMessage: 'Title',
        }),
        sortable: false,
        width: '55%',
        render: (title: ListKiTableRow['title']) => (
          <EuiTextBlockTruncate lines={1} cloneElement>
            <span data-test-subj="contextKiRowTitle">{getKiDisplayTitle(title)}</span>
          </EuiTextBlockTruncate>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnType', {
          defaultMessage: 'Type',
        }),
        sortable: false,
        width: '25%',
        render: (type: ListKiTableRow['type']) => (
          <KiTypeDisplay as="text" type={type} data-test-subj="contextKiRowType" />
        ),
      },
      {
        field: 'lifecycle_status',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnStatus', {
          defaultMessage: 'Status',
        }),
        sortable: false,
        width: '10%',
        render: (lifecycleStatus: ListKiTableRow['lifecycle_status'], ki) => (
          <KiLifecycleStatusBadge lifecycleStatus={lifecycleStatus} expiresAt={ki.expires_at} />
        ),
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnUpdatedAt', {
          defaultMessage: 'Updated',
        }),
        sortable: false,
        width: '10%',
        render: (updatedAt: ListKiTableRow['updated_at']) =>
          updatedAt ? (
            <EuiText size="s" data-test-subj="contextKiRowUpdatedAt">
              <KiFormattedDate value={updatedAt} />
            </EuiText>
          ) : (
            <EuiText size="s" color="subdued" data-test-subj="contextKiRowUpdatedAt">
              {noneValueLabel}
            </EuiText>
          ),
      },
    ];
  }, []);

  return (
    <EuiBasicTable
      data-test-subj="contextListKiTable"
      tableCaption={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.tableCaption', {
        defaultMessage: 'Knowledge Indicators',
      })}
      items={items}
      itemId="rowKey"
      columns={columns}
      loading={isRefetching}
      rowProps={(ki) => {
        const title = getKiDisplayTitle(ki.title);
        return {
          'data-test-subj': 'contextKiRow',
          onMouseEnter: () => prefetchKi(ki),
          onClick: () =>
            navigateToContextEngine(getViewKiPath(aiIndexId, ki.id), {
              index: ki.index,
            }),
          'aria-label': i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.viewKi', {
            defaultMessage: 'View Knowledge Indicator {title}',
            values: { title },
          }),
          ...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.listKi.OPEN_ROW,
          }),
        };
      }}
    />
  );
};
