/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { Criteria } from '@elastic/eui';
import {
  useActiveFilters,
  useContentListItems,
  useContentListPagination,
  useContentListSort,
} from '@kbn/content-list-provider';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { RuleApiResponse } from '../../services/rules_api';
import { UserCapabilities } from '../../services/user_capabilities';
import { useBulkSelect } from '../../hooks/use_bulk_select';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useBulkDeleteRules } from '../../hooks/use_bulk_delete_rules';
import { useBulkEnableRules, useBulkDisableRules } from '../../hooks/use_bulk_enable_disable_rules';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { useRunRule } from '../../hooks/use_run_rule';
import { DeleteConfirmationModal } from '../../components/rule/modals/delete_confirmation_modal';
import { RuleSummaryFlyout } from '../../components/rule/flyouts';
import { paths } from '../../constants';
import type { RuleContentListItem } from './rules_data_source';
import { toRulesQueryParams } from './rules_query_params';
import { RulesListTable, type RulesListTableSortField } from './rules_list_table';

/** Maps Content List / API sort fields onto the EuiBasicTable column fields. */
const API_SORT_TO_TABLE_FIELD: Record<string, RulesListTableSortField> = {
  name: 'metadata',
  kind: 'kind',
  enabled: 'enabled',
};

/** Maps EuiBasicTable sort column fields onto Content List / API sort fields. */
const TABLE_FIELD_TO_API_SORT_FIELD: Partial<Record<string, string>> = {
  metadata: 'name',
  kind: 'kind',
  enabled: 'enabled',
};

export interface RulesListTableContainerProps {
  onEditInFlyout: (rule: RuleApiResponse) => void;
  onCloneInFlyout: (rule: RuleApiResponse) => void;
}

/**
 * Bridges Content List query state (items, pagination, sort, filters) onto the
 * main-line {@link RulesListTable} + {@link useBulkSelect} selection model.
 * Must render under {@link ContentListProvider}.
 */
export const RulesListTableContainer: React.FC<RulesListTableContainerProps> = ({
  onEditInFlyout,
  onCloneInFlyout,
}) => {
  const canWrite = useService(UserCapabilities).canWrite('rules');
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const { items: contentItems, totalItems, isLoading, hasActiveQuery } = useContentListItems();
  const { pageIndex, pageSize, pageSizeOptions, setPageIndex, setPageSize } =
    useContentListPagination();
  const { field: sortField, direction: sortDirection, setSort } = useContentListSort();
  const activeFilters = useActiveFilters();
  const { filter, search } = useMemo(() => toRulesQueryParams(activeFilters), [activeFilters]);

  const items = useMemo(
    () => contentItems.map((item) => (item as RuleContentListItem).rule),
    [contentItems]
  );

  const tableSortField = API_SORT_TO_TABLE_FIELD[sortField];

  const onTableChange = ({ page: tablePage, sort }: Criteria<RuleApiResponse>) => {
    if (sort) {
      const nextSortField = TABLE_FIELD_TO_API_SORT_FIELD[sort.field as string];
      // EUI includes the current sort on pagination clicks too. SET_SORT resets
      // page index to 0, so only dispatch when the sort actually changed.
      if (nextSortField && (nextSortField !== sortField || sort.direction !== sortDirection)) {
        setSort(nextSortField, sort.direction);
        return;
      }
    }

    if (tablePage) {
      // SET_PAGE_SIZE always resets index to 0, so only call it when the size
      // actually changed. Otherwise a next-page click would bounce back to 0.
      if (tablePage.size !== pageSize) {
        setPageSize(tablePage.size);
      } else if (tablePage.index !== pageIndex) {
        setPageIndex(tablePage.index);
      }
    }
  };

  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const expandedRule = expandedRuleId ? items.find((r) => r.id === expandedRuleId) ?? null : null;

  const deleteRuleMutation = useDeleteRule();
  const bulkDeleteMutation = useBulkDeleteRules();
  const bulkEnableMutation = useBulkEnableRules();
  const bulkDisableMutation = useBulkDisableRules();
  const toggleEnabledMutation = useToggleRuleEnabled();
  const runRuleMutation = useRunRule();

  const {
    isAllSelected,
    selectedCount,
    isPageSelected,
    isRowSelected,
    onSelectRow,
    onSelectAll,
    onSelectPage,
    onClearSelection,
    getBulkParams,
  } = useBulkSelect({
    totalItemCount: totalItems,
    items,
    filter,
    search,
  });

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const onBulkDeleteConfirm = () => {
    bulkDeleteMutation.mutate(getBulkParams(), {
      onSuccess: () => {
        onClearSelection();
        setShowBulkDeleteConfirm(false);
      },
      onError: () => {
        setShowBulkDeleteConfirm(false);
      },
    });
  };

  const handleBulkEnable = () => {
    bulkEnableMutation.mutate(getBulkParams(), { onSuccess: onClearSelection });
  };

  const handleBulkDisable = () => {
    bulkDisableMutation.mutate(getBulkParams(), { onSuccess: onClearSelection });
  };

  const onDeleteConfirm = () => {
    if (!ruleToDelete) {
      return;
    }
    const deletedId = ruleToDelete.id;
    deleteRuleMutation.mutate(
      { id: deletedId, name: ruleToDelete.metadata.name },
      {
        /*
         * Drop the deleted row from whichever set holds it: unselect it in
         * inclusion mode, or clear its exclusion in select-all mode, so a
         * stale ID cannot leak into a later bulk action or skew the count.
         * A row that is merely *selected* in select-all mode (i.e. absent
         * from the exclusion set) is left alone to avoid double-counting.
         */
        onSuccess: () => {
          if (isAllSelected ? !isRowSelected(deletedId) : isRowSelected(deletedId)) {
            onSelectRow(deletedId);
          }
        },
        onSettled: () => {
          setRuleToDelete(null);
          setExpandedRuleId(null);
        },
      }
    );
  };

  return (
    <>
      <RulesListTable
        items={items}
        totalItemCount={totalItems}
        page={pageIndex + 1}
        perPage={pageSize}
        pageSizeOptions={pageSizeOptions}
        search={search ?? ''}
        hasActiveFilters={hasActiveQuery}
        sortField={tableSortField}
        sortDirection={sortDirection}
        isLoading={isLoading}
        canWrite={canWrite}
        selectedCount={selectedCount}
        isAllSelected={isAllSelected}
        isPageSelected={isPageSelected}
        isRowSelected={isRowSelected}
        onSelectRow={onSelectRow}
        onSelectPage={onSelectPage}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onBulkEnable={handleBulkEnable}
        onBulkDisable={handleBulkDisable}
        onBulkDelete={handleBulkDelete}
        onNavigateToDetails={(r) => navigateToUrl(basePath.prepend(paths.ruleDetails(r.id)))}
        onExpand={(r) => setExpandedRuleId(r.id)}
        onQuickEdit={(r) => onEditInFlyout(r)}
        onEdit={(r) => onEditInFlyout(r)}
        onClone={(r) => onCloneInFlyout(r)}
        onDelete={(r) => setRuleToDelete(r)}
        onToggleEnabled={(r) => toggleEnabledMutation.mutate({ id: r.id, enabled: !r.enabled })}
        onRun={(r) => runRuleMutation.mutate({ id: r.id })}
        togglingRuleId={
          toggleEnabledMutation.isLoading ? toggleEnabledMutation.variables?.id : undefined
        }
        isBulkTogglingEnabled={bulkEnableMutation.isLoading || bulkDisableMutation.isLoading}
        onTableChange={onTableChange}
      />
      {expandedRule ? (
        <RuleSummaryFlyout
          rule={expandedRule}
          canWrite={canWrite}
          onClose={() => setExpandedRuleId(null)}
          onQuickEdit={(r) => {
            setExpandedRuleId(null);
            onEditInFlyout(r);
          }}
          onEdit={(r) => {
            setExpandedRuleId(null);
            onEditInFlyout(r);
          }}
          onClone={(r) => {
            setExpandedRuleId(null);
            onCloneInFlyout(r);
          }}
          onDelete={(r) => setRuleToDelete(r)}
          onToggleEnabled={(r) => toggleEnabledMutation.mutate({ id: r.id, enabled: !r.enabled })}
          onRun={(r) => runRuleMutation.mutate({ id: r.id })}
        />
      ) : null}
      {ruleToDelete ? (
        <DeleteConfirmationModal
          ruleName={ruleToDelete.metadata?.name ?? ruleToDelete.id}
          onCancel={() => setRuleToDelete(null)}
          onConfirm={onDeleteConfirm}
          isLoading={deleteRuleMutation.isLoading}
        />
      ) : null}
      {showBulkDeleteConfirm ? (
        <DeleteConfirmationModal
          ruleCount={selectedCount}
          onCancel={() => setShowBulkDeleteConfirm(false)}
          onConfirm={onBulkDeleteConfirm}
          isLoading={bulkDeleteMutation.isLoading}
        />
      ) : null}
    </>
  );
};
