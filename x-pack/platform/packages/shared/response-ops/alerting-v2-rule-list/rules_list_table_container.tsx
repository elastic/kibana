/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { RuleApiResponse } from './rules_api';
import { useRuleListServices, useRuleListPaths } from './rule_list_context';
import { useBulkSelect } from './use_bulk_select';
import { useDeleteRule } from './use_delete_rule';
import { useBulkDeleteRules } from './use_bulk_delete_rules';
import { useBulkEnableRules, useBulkDisableRules } from './use_bulk_enable_disable_rules';
import { useToggleRuleEnabled } from './use_toggle_rule_enabled';
import { DeleteConfirmationModal } from './delete_confirmation_modal';
import { RulesListTable } from './rules_list_table';

export interface RulesListTableContainerProps {
  items: RuleApiResponse[];
  totalItemCount: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  onTableChange: (criteria: CriteriaWithPagination<RuleApiResponse>) => void;
}

export const RulesListTableContainer: React.FC<RulesListTableContainerProps> = ({
  items,
  totalItemCount,
  page,
  perPage,
  isLoading,
  onTableChange,
}) => {
  const { application, http } = useRuleListServices();
  const paths = useRuleListPaths();

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
        onEdit={(r) => application.navigateToUrl(http.basePath.prepend(paths.ruleEdit(r.id)))}
        onClone={(r) =>
          application.navigateToUrl(
            http.basePath.prepend(`${paths.ruleCreate}?cloneFrom=${encodeURIComponent(r.id)}`)
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
