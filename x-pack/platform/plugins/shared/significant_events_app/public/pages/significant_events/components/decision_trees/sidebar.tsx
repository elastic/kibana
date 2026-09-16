/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroup,
  EuiListGroupItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getDecisionTreeStatusLabel } from './labels';
import type { DecisionTreeStatusFilter, DecisionTreeSummary, DecisionTreeStatus } from './types';
import { DECISION_TREE_STATUSES } from './types';

export type DecisionTreeSidebarSelection = { kind: 'home' } | { kind: 'tree'; symptom: string };

interface DecisionTreeSidebarProps {
  trees: DecisionTreeSummary[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: DecisionTreeStatusFilter;
  onStatusFilterChange: (value: DecisionTreeStatusFilter) => void;
  selection: DecisionTreeSidebarSelection;
  onSelect: (selection: DecisionTreeSidebarSelection) => void;
}

export function DecisionTreeSidebar({
  trees,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selection,
  onSelect,
}: DecisionTreeSidebarProps) {
  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return trees.filter((tree) => {
      const matchesStatus = statusFilter === 'all' || tree.status === statusFilter;
      const matchesQuery =
        query.length === 0 ||
        tree.title.toLowerCase().includes(query) ||
        tree.symptom.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [trees, searchQuery, statusFilter]);

  const statusOptions: Array<{ value: DecisionTreeStatusFilter; text: string }> = [
    {
      value: 'all',
      text: i18n.translate('xpack.significantEventsApp.decisionTrees.sidebar.allStatuses', {
        defaultMessage: 'All statuses',
      }),
    },
    ...DECISION_TREE_STATUSES.map((status: DecisionTreeStatus) => ({
      value: status,
      text: getDecisionTreeStatusLabel(status),
    })),
  ];

  return (
    <EuiFlexGroup direction="column" gutterSize="s" style={{ height: '100%' }}>
      <EuiFlexItem grow={false}>
        <EuiListGroup>
          <EuiListGroupItem
            label={i18n.translate('xpack.significantEventsApp.decisionTrees.sidebar.overview', {
              defaultMessage: 'Overview',
            })}
            iconType="home"
            isActive={selection.kind === 'home'}
            onClick={() => onSelect({ kind: 'home' })}
          />
        </EuiListGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFieldSearch
          compressed
          fullWidth
          placeholder={i18n.translate(
            'xpack.significantEventsApp.decisionTrees.sidebar.searchPlaceholder',
            { defaultMessage: 'Search trees' }
          )}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          data-test-subj="nightshiftDecisionTreeSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          fullWidth
          options={statusOptions}
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value as DecisionTreeStatusFilter)}
          data-test-subj="nightshiftDecisionTreeStatusFilter"
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ overflowY: 'auto', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('xpack.significantEventsApp.decisionTrees.sidebar.noResults', {
              defaultMessage: 'No decision trees match.',
            })}
          </EuiText>
        ) : (
          <EuiListGroup>
            {filtered.map((tree) => (
              <EuiListGroupItem
                key={tree.tree_id}
                label={tree.title}
                isActive={selection.kind === 'tree' && selection.symptom === tree.symptom}
                onClick={() => onSelect({ kind: 'tree', symptom: tree.symptom })}
                wrapText
                data-test-subj={`nightshiftDecisionTreeSidebarItem-${tree.symptom}`}
              />
            ))}
          </EuiListGroup>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSpacer size="xs" />
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{filtered.length}</EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {i18n.translate('xpack.significantEventsApp.decisionTrees.sidebar.treeCount', {
                defaultMessage: '{count, plural, one {tree} other {trees}}',
                values: { count: filtered.length },
              })}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
