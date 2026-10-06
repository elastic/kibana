/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiText,
  EuiTextBlockTruncate,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import {
  formatKiListLifecycleStatusesQuery,
  KI_LIST_ACTIVE_AND_DELETED_LIFECYCLE_STATUSES,
} from '../../../../common/ki_list_lifecycle';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { useNavigation } from '../../hooks/use_navigation';
import { getKiDetailPath } from '../../paths';
import { KiFormattedDate } from './ki_formatted_date';
import {
  getKiDisplayTitle,
  getKiDisplayTypeLabel,
  getKiLifecycleStatusLabel,
  noneValueLabel,
} from './helpers';

interface KiListTableRow extends KiListItem {
  rowKey: string;
}

interface KiListTableProps {
  aiIndexId: string;
  kis: KiListItem[];
}

const toTableRow = (ki: KiListItem): KiListTableRow => ({
  ...ki,
  rowKey: `${ki.index}:${ki.id}`,
});

export const KiListTable = ({ aiIndexId, kis }: KiListTableProps) => {
  const { navigateToContextEngine } = useNavigation();

  const items = useMemo(() => kis.map(toTableRow), [kis]);

  const columns = useMemo((): Array<EuiBasicTableColumn<KiListTableRow>> => {
    return [
      {
        field: 'title',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.columnTitle', {
          defaultMessage: 'Title',
        }),
        sortable: false,
        width: '40%',
        render: (_, ki) => (
          <EuiTextBlockTruncate lines={2} cloneElement>
            <span data-test-subj="contextKiRowTitle">{getKiDisplayTitle(ki.title)}</span>
          </EuiTextBlockTruncate>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.columnType', {
          defaultMessage: 'Type',
        }),
        sortable: false,
        render: (_, ki) => (
          <EuiText size="s" color="subdued" data-test-subj="contextKiRowType">
            {getKiDisplayTypeLabel(ki.type)}
          </EuiText>
        ),
      },
      {
        field: 'lifecycleStatus',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.columnStatus', {
          defaultMessage: 'Status',
        }),
        sortable: false,
        render: (_, ki) => {
          if (ki.lifecycleStatus === undefined) {
            return (
              <EuiText size="s" color="subdued" data-test-subj="contextKiRowLifecycleStatus">
                {noneValueLabel}
              </EuiText>
            );
          }
          return (
            <EuiBadge
              color={ki.lifecycleStatus === 'deleted' ? 'danger' : 'success'}
              data-test-subj="contextKiRowLifecycleStatus"
            >
              {getKiLifecycleStatusLabel(ki.lifecycleStatus)}
            </EuiBadge>
          );
        },
      },
      {
        field: 'updatedAt',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.columnUpdatedAt', {
          defaultMessage: 'Updated',
        }),
        sortable: false,
        render: (_, ki) => {
          if (ki.updatedAt === undefined) {
            return (
              <EuiText size="s" color="subdued" data-test-subj="contextKiRowUpdatedAt">
                {noneValueLabel}
              </EuiText>
            );
          }
          return (
            <span data-test-subj="contextKiRowUpdatedAt">
              <KiFormattedDate value={ki.updatedAt} />
            </span>
          );
        },
      },
    ];
  }, []);

  return (
    <EuiBasicTable
      data-test-subj="contextKiListTable"
      tableCaption={i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.tableCaption', {
        defaultMessage: 'Knowledge Indicators',
      })}
      items={items}
      itemId="rowKey"
      columns={columns}
      rowProps={(ki) => {
        const title = getKiDisplayTitle(ki.title);
        return {
          'data-test-subj': 'contextKiRow',
          onClick: () =>
            navigateToContextEngine(getKiDetailPath(aiIndexId, ki.id), {
              index: ki.index,
              lifecycle_status: formatKiListLifecycleStatusesQuery(
                KI_LIST_ACTIVE_AND_DELETED_LIFECYCLE_STATUSES
              ),
            }),
          style: { cursor: 'pointer' },
          'aria-label': i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.viewKi', {
            defaultMessage: 'View Knowledge Indicator {title}',
            values: { title },
          }),
          ...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageKiListPanel,
            action: CONTEXT_ENGINE_UI_EBT.action.kiList.OPEN_ROW,
          }),
        };
      }}
    />
  );
};
