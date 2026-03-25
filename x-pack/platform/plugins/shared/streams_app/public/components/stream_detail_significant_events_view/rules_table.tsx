/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  type CriteriaWithPagination,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React, { useCallback, useMemo, useState } from 'react';
import { useQueriesBulkDelete } from './hooks/use_queries_bulk_delete';
import { SeverityBadge } from '../significant_events_discovery/components/severity_badge/severity_badge';
import { SparkPlot } from '../spark_plot';
import { formatLastOccurredAt } from '../significant_events_discovery/components/queries_table/utils';
import { TableTitle } from '../stream_detail_systems/table_title';
import type { SignificantEventQueryRow } from '../../hooks/use_fetch_discovery_queries';

interface RulesTableProps {
  definition: Streams.all.Definition;
  rules: SignificantEventQueryRow[];
  searchTerm: string;
}

export function RulesTable({ definition, rules, searchTerm }: RulesTableProps) {
  const [selectedRules, setSelectedRules] = useState<SignificantEventQueryRow[]>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const { deleteRulesInBulk, isDeleting } = useQueriesBulkDelete({
    definition,
    onSuccess: () => setSelectedRules([]),
  });

  const filteredRules = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return rules;
    }

    return rules.filter((rule) => {
      const title = (rule.query.title ?? '').toLowerCase();
      return title.includes(normalizedSearchTerm);
    });
  }, [rules, searchTerm]);
  const isSelectionActionsDisabled = selectedRules.length === 0;

  const handleTableChange = useCallback(
    ({ page }: CriteriaWithPagination<SignificantEventQueryRow>) => {
      if (!page) {
        return;
      }

      setPagination({
        pageIndex: page.index,
        pageSize: page.size,
      });
    },
    []
  );

  const columns = useMemo<Array<EuiBasicTableColumn<SignificantEventQueryRow>>>(
    () => [
      {
        name: RULES_TABLE_RULES_COLUMN_LABEL,
        render: (item: SignificantEventQueryRow) => item.query.title || item.query.id,
      },
      {
        name: RULES_TABLE_SEVERITY_COLUMN_LABEL,
        align: 'left',
        width: '120px',
        render: (item: SignificantEventQueryRow) => (
          <SeverityBadge score={item.query.severity_score} />
        ),
      },
      {
        name: RULES_TABLE_LAST_OCCURRED_COLUMN_LABEL,
        align: 'left',
        width: '220px',
        render: (item: SignificantEventQueryRow) => formatLastOccurredAt(item.occurrences),
      },
      {
        name: RULES_TABLE_EVENTS_COLUMN_LABEL,
        width: '160px',
        align: 'center',
        render: (item: SignificantEventQueryRow) => (
          <SparkPlot
            id={`rules-events-${item.query.id}`}
            name={RULES_TABLE_OCCURRENCES_TOOLTIP_NAME}
            type="bar"
            timeseries={item.occurrences}
            annotations={[]}
            compressed
            hideAxis
            height={32}
          />
        ),
      },
      {
        name: RULES_TABLE_ACTIONS_COLUMN_LABEL,
        width: '120px',
        render: () => null,
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <TableTitle
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            total={filteredRules.length}
            label={RULES_TABLE_LABEL}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="cross"
            size="xs"
            aria-label={RULES_TABLE_CLEAR_SELECTION_LABEL}
            isDisabled={isSelectionActionsDisabled}
            onClick={() => setSelectedRules([])}
          >
            {RULES_TABLE_CLEAR_SELECTION_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="trash"
            color="danger"
            size="xs"
            aria-label={RULES_TABLE_DELETE_BULK_ACTION_LABEL}
            isLoading={isDeleting}
            isDisabled={isSelectionActionsDisabled || isDeleting}
            onClick={() => {
              void deleteRulesInBulk(selectedRules.map((item) => item.query.id));
            }}
          >
            {RULES_TABLE_DELETE_BULK_ACTION_LABEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiHorizontalRule margin="none" style={{ height: 2 }} />
      <EuiInMemoryTable<SignificantEventQueryRow>
        items={filteredRules}
        itemId={(item) => item.query.id}
        columns={columns}
        selection={{
          selected: selectedRules,
          onSelectionChange: setSelectedRules,
        }}
        pagination={{
          pageIndex: pagination.pageIndex,
          pageSize: pagination.pageSize,
          pageSizeOptions: [10, 25, 50],
        }}
        onTableChange={handleTableChange}
        tableCaption={i18n.translate('xpack.streams.rulesTable.tableCaption', {
          defaultMessage: 'Rules',
        })}
      />
    </>
  );
}

const RULES_TABLE_RULES_COLUMN_LABEL = i18n.translate(
  'xpack.streams.rulesTable.columns.rulesLabel',
  {
    defaultMessage: 'Rules',
  }
);

const RULES_TABLE_SEVERITY_COLUMN_LABEL = i18n.translate(
  'xpack.streams.rulesTable.columns.severityLabel',
  {
    defaultMessage: 'Severity',
  }
);

const RULES_TABLE_LAST_OCCURRED_COLUMN_LABEL = i18n.translate(
  'xpack.streams.rulesTable.columns.lastOccurredLabel',
  {
    defaultMessage: 'Last occurred',
  }
);

const RULES_TABLE_EVENTS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.rulesTable.columns.eventsLabel',
  {
    defaultMessage: 'Events',
  }
);

const RULES_TABLE_ACTIONS_COLUMN_LABEL = i18n.translate(
  'xpack.streams.rulesTable.columns.actionsLabel',
  {
    defaultMessage: 'Actions',
  }
);

const RULES_TABLE_OCCURRENCES_TOOLTIP_NAME = i18n.translate(
  'xpack.streams.rulesTable.occurrencesTooltipName',
  {
    defaultMessage: 'Detected event occurrences',
  }
);

const RULES_TABLE_CLEAR_SELECTION_LABEL = i18n.translate(
  'xpack.streams.rulesTable.clearSelectionLabel',
  {
    defaultMessage: 'Clear selection',
  }
);

const RULES_TABLE_DELETE_BULK_ACTION_LABEL = i18n.translate(
  'xpack.streams.rulesTable.deleteBulkActionLabel',
  {
    defaultMessage: 'Delete selected',
  }
);

const RULES_TABLE_LABEL = i18n.translate('xpack.streams.rulesTable.label', {
  defaultMessage: 'Rules',
});
