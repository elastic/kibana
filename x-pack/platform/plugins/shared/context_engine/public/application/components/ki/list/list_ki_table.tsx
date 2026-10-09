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
}

const toTableRow = (ki: KiListItem): ListKiTableRow => ({
  ...ki,
  rowKey: `${ki.index}:${ki.id}`,
});

export const ListKiTable = ({ aiIndexId, kis }: ListKiTableProps) => {
  const { navigateToContextEngine } = useNavigation();
  const prefetchKi = usePrefetchKi(aiIndexId);

  const items = useMemo(() => kis.map(toTableRow), [kis]);

  const columns = useMemo((): Array<EuiBasicTableColumn<ListKiTableRow>> => {
    return [
      {
        field: 'title',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnTitle', {
          defaultMessage: 'Title',
        }),
        sortable: false,
        width: '55%',
        render: (_, ki) => (
          <EuiTextBlockTruncate lines={1} cloneElement>
            <span data-test-subj="contextKiRowTitle">{getKiDisplayTitle(ki.title)}</span>
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
        render: (_, ki) => (
          <KiTypeDisplay as="text" type={ki.type} data-test-subj="contextKiRowType" />
        ),
      },
      {
        field: 'lifecycle_status',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnStatus', {
          defaultMessage: 'Status',
        }),
        sortable: false,
        width: '10%',
        render: (_, ki) => <KiLifecycleStatusBadge lifecycleStatus={ki.lifecycle_status} />,
      },
      {
        field: 'updated_at',
        name: i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.columnUpdatedAt', {
          defaultMessage: 'Updated',
        }),
        sortable: false,
        width: '10%',
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
      data-test-subj="contextListKiTable"
      tableCaption={i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.tableCaption', {
        defaultMessage: 'Knowledge Indicators',
      })}
      items={items}
      itemId="rowKey"
      columns={columns}
      rowProps={(ki) => {
        const title = getKiDisplayTitle(ki.title);
        return {
          'data-test-subj': 'contextKiRow',
          onMouseEnter: () => prefetchKi(ki),
          onClick: () =>
            navigateToContextEngine(getViewKiPath(aiIndexId, ki.id), {
              index: ki.index,
            }),
          style: { cursor: 'pointer' },
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
