/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import type { Criteria } from '@elastic/eui';
import type { RuleApiResponse } from '../../services/rules_api';
import { useBulkSelect } from '../../hooks/use_bulk_select';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useBulkDeleteRules } from '../../hooks/use_bulk_delete_rules';
import { useBulkEnableRules, useBulkDisableRules } from '../../hooks/use_bulk_enable_disable_rules';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { DeleteConfirmationModal } from '../../components/rule/modals/delete_confirmation_modal';
import { paths } from '../../constants';
import { RulesListTable, type RulesListTableSortField } from './rules_list_table';

export interface RulesListTableContainerProps {
  items: RuleApiResponse[];
  totalItemCount: number;
  page: number;
  perPage: number;
  search: string;
  hasActiveFilters: boolean;
  sortField?: RulesListTableSortField;
  sortDirection?: 'asc' | 'desc';
  isLoading: boolean;
  onTableChange: (criteria: Criteria<RuleApiResponse>) => void;
}

export const RulesListTableContainer: React.FC<RulesListTableContainerProps> = ({
  items,
  totalItemCount,
  page,
  perPage,
  search,
  hasActiveFilters,
  sortField,
  sortDirection,
  isLoading,
  onTableChange,
}) => {
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const deleteRuleMutation = useDeleteRule();
  const bulkDeleteMutation = useBulkDeleteRules();
  const bulkEnableMutation = useBulkEnableRules();
  const bulkDisableMutation = useBulkDisableRules();
  const toggleEnabledMutation = useToggleRuleEnabled();

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
  } = useBulkSelect({ totalItemCount, items });

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
    deleteRuleMutation.mutate(ruleToDelete.id, {
      onSettled: () => setRuleToDelete(null),
    });
  };

  return (
    <>
      <RulesListTable
        items={items}
        totalItemCount={totalItemCount}
        page={page}
        perPage={perPage}
        search={search}
        hasActiveFilters={hasActiveFilters}
        sortField={sortField}
        sortDirection={sortDirection}
        isLoading={isLoading}
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
        onEdit={(r) => navigateToUrl(basePath.prepend(paths.ruleEdit(r.id)))}
        onClone={(r) =>
          navigateToUrl(
            basePath.prepend(`${paths.ruleCreate}?cloneFrom=${encodeURIComponent(r.id)}`)
          )
        }
        onDelete={(r) => setRuleToDelete(r)}
        onToggleEnabled={(r) => toggleEnabledMutation.mutate({ id: r.id, enabled: !r.enabled })}
        onTableChange={onTableChange}
      />
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
