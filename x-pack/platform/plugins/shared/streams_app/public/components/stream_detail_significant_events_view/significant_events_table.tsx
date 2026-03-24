/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  type CriteriaWithPagination,
  EuiBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { KnowledgeIndicator } from '@kbn/streams-ai';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { SparkPlot } from '../spark_plot';
import { TableTitle } from '../stream_detail_systems/table_title';

interface SignificantEventsTableProps {
  knowledgeIndicators: KnowledgeIndicator[];
  occurrencesByQueryId: Record<string, Array<{ x: number; y: number }>>;
  searchTerm: string;
  selectedTypes: string[];
  statusFilter: 'active' | 'excluded';
}

const getKnowledgeIndicatorItemId = (knowledgeIndicator: KnowledgeIndicator) => {
  if (knowledgeIndicator.kind === 'feature') {
    return `feature:${knowledgeIndicator.feature.uuid}`;
  }

  return `query:${knowledgeIndicator.query.id}`;
};

export function SignificantEventsTable({
  knowledgeIndicators,
  occurrencesByQueryId,
  searchTerm,
  selectedTypes,
  statusFilter,
}: SignificantEventsTableProps) {
  const [selectedKnowledgeIndicators, setSelectedKnowledgeIndicators] = useState<
    KnowledgeIndicator[]
  >([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 25 });

  const filteredKnowledgeIndicators = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return knowledgeIndicators.filter((knowledgeIndicator) => {
      const matchesStatusFilter =
        statusFilter === 'active'
          ? knowledgeIndicator.kind === 'query' || !knowledgeIndicator.feature.excluded_at
          : knowledgeIndicator.kind === 'feature' &&
            Boolean(knowledgeIndicator.feature.excluded_at);

      if (!matchesStatusFilter) {
        return false;
      }

      const type =
        knowledgeIndicator.kind === 'feature' ? knowledgeIndicator.feature.type : 'query';
      const matchesType = selectedTypes.length === 0 || selectedTypes.includes(type);

      if (!matchesType) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      if (knowledgeIndicator.kind === 'feature') {
        return (knowledgeIndicator.feature.title ?? '')
          .toLowerCase()
          .includes(normalizedSearchTerm);
      }

      return (knowledgeIndicator.query.title ?? '').toLowerCase().includes(normalizedSearchTerm);
    });
  }, [knowledgeIndicators, searchTerm, selectedTypes, statusFilter]);

  const isSelectionActionsDisabled = selectedKnowledgeIndicators.length === 0;

  const handleTableChange = useCallback(({ page }: CriteriaWithPagination<KnowledgeIndicator>) => {
    if (!page) {
      return;
    }

    setPagination({
      pageIndex: page.index,
      pageSize: page.size,
    });
  }, []);

  const columns = useMemo<Array<EuiBasicTableColumn<KnowledgeIndicator>>>(
    () => [
      {
        name: SIGNIFICANT_EVENTS_TABLE_TITLE_COLUMN_LABEL,
        render: (knowledgeIndicator: KnowledgeIndicator) => {
          if (knowledgeIndicator.kind === 'feature') {
            return knowledgeIndicator.feature.title ?? knowledgeIndicator.feature.id;
          }

          return knowledgeIndicator.query.title ?? knowledgeIndicator.query.id;
        },
      },
      {
        name: SIGNIFICANT_EVENTS_TABLE_EVENTS_COLUMN_LABEL,
        width: '160px',
        render: (knowledgeIndicator: KnowledgeIndicator) => {
          if (knowledgeIndicator.kind !== 'query' || !knowledgeIndicator.rule.backed) {
            return null;
          }

          const occurrences = occurrencesByQueryId[knowledgeIndicator.query.id];

          if (!occurrences) {
            return null;
          }

          return (
            <SparkPlot
              id={`ki-events-${knowledgeIndicator.query.id}`}
              name={SIGNIFICANT_EVENTS_TABLE_OCCURRENCES_TOOLTIP_NAME}
              type="bar"
              timeseries={occurrences}
              annotations={[]}
              compressed
              hideAxis
              height={32}
            />
          );
        },
      },
      {
        name: SIGNIFICANT_EVENTS_TABLE_TYPE_COLUMN_LABEL,
        width: '200px',
        render: (knowledgeIndicator: KnowledgeIndicator) => {
          if (knowledgeIndicator.kind === 'feature') {
            return (
              <EuiBadge
                color="hollow"
                css={css`
                  text-transform: capitalize;
                `}
              >
                {knowledgeIndicator.feature.type}
              </EuiBadge>
            );
          }

          return <EuiBadge color="hollow">{SIGNIFICANT_EVENTS_TABLE_QUERY_TYPE_LABEL}</EuiBadge>;
        },
      },
      {
        name: SIGNIFICANT_EVENTS_TABLE_ACTIONS_COLUMN_LABEL,
        width: '120px',
        render: () => null,
      },
    ],
    [occurrencesByQueryId]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={filteredKnowledgeIndicators.length}
            label={SIGNIFICANT_EVENTS_TABLE_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            aria-label={SIGNIFICANT_EVENTS_TABLE_CLEAR_SELECTION_LABEL}
            isDisabled={isSelectionActionsDisabled}
            onClick={() => setSelectedKnowledgeIndicators([])}
          >
            {SIGNIFICANT_EVENTS_TABLE_CLEAR_SELECTION_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="trash"
            color="danger"
            size="xs"
            aria-label={SIGNIFICANT_EVENTS_TABLE_DELETE_BULK_ACTION_LABEL}
            isDisabled={isSelectionActionsDisabled}
            onClick={() => {}}
          >
            {SIGNIFICANT_EVENTS_TABLE_DELETE_BULK_ACTION_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiInMemoryTable<KnowledgeIndicator>
        items={filteredKnowledgeIndicators}
        itemId={getKnowledgeIndicatorItemId}
        columns={columns}
        selection={{
          selected: selectedKnowledgeIndicators,
          onSelectionChange: setSelectedKnowledgeIndicators,
        }}
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: [25, 50, 100],
        }}
        onTableChange={handleTableChange}
        tableCaption={SIGNIFICANT_EVENTS_TABLE_CAPTION}
      />
    </>
  );
}

const SIGNIFICANT_EVENTS_TABLE_TITLE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.columns.titleLabel',
  {
    defaultMessage: 'Knowledge Indicator',
  }
);

const SIGNIFICANT_EVENTS_TABLE_TYPE_COLUMN_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.columns.typeLabel',
  {
    defaultMessage: 'Type',
  }
);

const SIGNIFICANT_EVENTS_TABLE_QUERY_TYPE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.columns.queryTypeLabel',
  {
    defaultMessage: 'Query',
  }
);

const SIGNIFICANT_EVENTS_TABLE_ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.columns.actionsLabel',
  {
    defaultMessage: 'Actions',
  }
);

const SIGNIFICANT_EVENTS_TABLE_EVENTS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.columns.eventsLabel',
  {
    defaultMessage: 'Events',
  }
);

const SIGNIFICANT_EVENTS_TABLE_CAPTION = i18n.translate(
  'xpack.streams.significantEventsTable.tableCaption',
  {
    defaultMessage: 'Significant events',
  }
);

const SIGNIFICANT_EVENTS_TABLE_OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.significantEventsTable.occurrencesTooltipName',
  {
    defaultMessage: 'Detected event occurrences',
  }
);

const SIGNIFICANT_EVENTS_TABLE_CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.clearSelectionLabel',
  {
    defaultMessage: 'Clear selection',
  }
);

const SIGNIFICANT_EVENTS_TABLE_DELETE_BULK_ACTION_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.deleteBulkActionLabel',
  {
    defaultMessage: 'Delete',
  }
);

const SIGNIFICANT_EVENTS_TABLE_LABEL = i18n.translate(
  'xpack.streams.significantEventsTable.label',
  {
    defaultMessage: 'Knowledge indicators',
  }
);
