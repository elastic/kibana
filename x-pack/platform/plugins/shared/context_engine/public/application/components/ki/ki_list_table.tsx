/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  type EuiBasicTableColumn,
  EuiText,
  EuiTextBlockTruncate,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { useNavigation } from '../../hooks/use_navigation';
import { getKiDetailPath } from '../../paths';
import { getKiDisplayTitle, getKiDisplayTypeLabel, noneValueLabel } from './helpers';
import { KiFormattedDate } from './ki_formatted_date';
import { KiListLifecycleStatusBadge } from './ki_list_lifecycle_status_badge';

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
        width: '46%',
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
        width: '18%',
        render: (_, ki) => (
          <EuiText size="s" color="subdued" data-test-subj="contextKiRowType">
            {getKiDisplayTypeLabel(ki.type)}
          </EuiText>
        ),
      },
      {
        field: 'lifecycle_status',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.columnStatus', {
          defaultMessage: 'Status',
        }),
        sortable: false,
        width: '15%',
        render: (_, ki) => <KiListLifecycleStatusBadge lifecycleStatus={ki.lifecycle_status} />,
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.columnUpdatedAt', {
          defaultMessage: 'Updated',
        }),
        sortable: false,
        width: '21%',
        render: (_, ki) =>
          ki.updated_at ? (
            <EuiText size="s" data-test-subj="contextKiRowUpdatedAt">
              <KiFormattedDate value={ki.updated_at} />
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
