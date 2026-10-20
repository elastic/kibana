/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBasicTable,
  EuiButton,
  EuiLink,
  EuiText,
  type CriteriaWithPagination,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { ListOnlineScoresResponse } from '@kbn/evals-common';
import { i18n } from '@kbn/i18n';

type OnlineScoreRow = ListOnlineScoresResponse['data'][number];

const encodeRowIdPart = (value: string): string => `${value.length}:${value}`;

export const getOnlineScoreRowId = (item: OnlineScoreRow): string =>
  [item.trace_id, item.evaluator.name, item.evaluator.version, item.score.name]
    .map(encodeRowIdPart)
    .join('|');

export interface OnlineEvalScoresTableProps {
  items: OnlineScoreRow[];
  totalItemCount: number;
  pageIndex: number;
  pageSize: number;
  loading: boolean;
  onPageChange: (nextPageIndex: number) => void;
  onTraceClick: (traceId: string) => void;
}

export const OnlineEvalScoresTable: React.FC<OnlineEvalScoresTableProps> = ({
  items,
  totalItemCount,
  pageIndex,
  pageSize,
  loading,
  onPageChange,
  onTraceClick,
}) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, JSX.Element>>({});

  const columns: Array<EuiBasicTableColumn<OnlineScoreRow>> = useMemo(
    () => [
      {
        field: '@timestamp',
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.timeColumn', {
          defaultMessage: 'Time',
        }),
        width: '190px',
      },
      {
        field: 'trace_id',
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.traceIdColumn', {
          defaultMessage: 'Trace ID',
        }),
        render: (traceId: string) => (
          <EuiLink onClick={() => onTraceClick(traceId)}>{traceId}</EuiLink>
        ),
      },
      {
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.evaluatorColumn', {
          defaultMessage: 'Evaluator',
        }),
        render: (item: OnlineScoreRow) => `${item.evaluator.name}@${item.evaluator.version}`,
      },
      {
        field: 'score.name',
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.scoreNameColumn', {
          defaultMessage: 'Score name',
        }),
      },
      {
        field: 'score.value',
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.valueColumn', {
          defaultMessage: 'Value',
        }),
      },
      {
        field: 'score.label',
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.labelColumn', {
          defaultMessage: 'Label',
        }),
        render: (label?: string) => label ?? '-',
      },
      {
        name: i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.explanationColumn', {
          defaultMessage: 'Explanation',
        }),
        width: '130px',
        align: 'right',
        render: (item: OnlineScoreRow) => {
          if (!item.score.explanation) {
            return '-';
          }

          const rowId = getOnlineScoreRowId(item);
          const isExpanded = rowId in expandedRows;
          return (
            <EuiButton
              size="s"
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              onClick={() => {
                setExpandedRows((previous) => {
                  if (rowId in previous) {
                    const { [rowId]: _removed, ...rest } = previous;
                    return rest;
                  }

                  return {
                    ...previous,
                    [rowId]: (
                      <EuiText size="s" data-test-subj={`onlineScoreExplanation-${rowId}`}>
                        <p>{item.score.explanation}</p>
                      </EuiText>
                    ),
                  };
                });
              }}
            >
              {isExpanded
                ? i18n.translate(
                    'xpack.evals.onlineEvaluations.detail.scoresTable.hideExplanationButton',
                    {
                      defaultMessage: 'Hide',
                    }
                  )
                : i18n.translate(
                    'xpack.evals.onlineEvaluations.detail.scoresTable.showExplanationButton',
                    {
                      defaultMessage: 'Show',
                    }
                  )}
            </EuiButton>
          );
        },
      },
    ],
    [expandedRows, onTraceClick]
  );

  const pagination = {
    pageIndex,
    pageSize,
    totalItemCount,
    pageSizeOptions: [pageSize],
    hidePerPageOptions: true,
  };

  return (
    <EuiBasicTable<OnlineScoreRow>
      items={items}
      columns={columns}
      loading={loading}
      pagination={pagination}
      onChange={({ page }: CriteriaWithPagination<OnlineScoreRow>) => {
        if (page) {
          onPageChange(page.index);
        }
      }}
      noItemsMessage={i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTable.empty', {
        defaultMessage: 'No scores have been indexed yet for this online evaluation.',
      })}
      tableCaption={i18n.translate('xpack.evals.onlineEvaluations.detail.scoresTableCaption', {
        defaultMessage: 'Recent online evaluation scores',
      })}
      itemId={getOnlineScoreRowId}
      itemIdToExpandedRowMap={expandedRows}
      data-test-subj="onlineEvalRecentScoresTable"
    />
  );
};
