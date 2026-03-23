/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { RuleApiResponse } from '@kbn/alerting-v2-rule-apis';
import {
  useDeleteRule,
  useBulkDeleteRules,
  useBulkEnableRules,
  useBulkDisableRules,
  useToggleRuleEnabled,
} from '@kbn/alerting-v2-rule-apis';
import {
  ALERTING_V2_RULE_EDIT_LOCATOR,
  ALERTING_V2_RULE_CREATE_LOCATOR,
  type AlertingV2RuleEditLocatorParams,
  type AlertingV2RuleCreateLocatorParams,
} from '@kbn/deeplinks-alerting-v2';
import { useRuleListServices } from '../rule_list_context';
import { useBulkSelect } from '../hooks/use_bulk_select';
import { DeleteConfirmationModal } from './delete_confirmation_modal';
import { RulesListTable } from './rules_list_table';

export interface RulesListTableContainerProps {
  items: RuleApiResponse[];
  totalItemCount: number;
  page: number;
  perPage: number;
  isLoading: boolean;
  onTableChange: (criteria: CriteriaWithPagination<RuleApiResponse>) => void;
  share: SharePluginStart;
}

export const RulesListTableContainer: React.FC<RulesListTableContainerProps> = ({
  items,
  totalItemCount,
  page,
  perPage,
  isLoading,
  onTableChange,
  share,
}) => {
  const { http, notifications } = useRuleListServices();

  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const deleteRuleMutation = useDeleteRule({ http, notifications });
  const bulkDeleteMutation = useBulkDeleteRules({ http, notifications });
  const bulkEnableMutation = useBulkEnableRules({ http, notifications });
  const bulkDisableMutation = useBulkDisableRules({ http, notifications });
  const toggleEnabledMutation = useToggleRuleEnabled({ http, notifications });

  const editLocator = share.url.locators.get<AlertingV2RuleEditLocatorParams>(
    ALERTING_V2_RULE_EDIT_LOCATOR
  );
  const createLocator = share.url.locators.get<AlertingV2RuleCreateLocatorParams>(
    ALERTING_V2_RULE_CREATE_LOCATOR
  );

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

  const handleEdit = useCallback(
    (r: RuleApiResponse) => {
      editLocator?.navigate({ ruleId: r.id });
    },
    [editLocator]
  );

  const handleClone = useCallback(
    (r: RuleApiResponse) => {
      createLocator?.navigate({ cloneFrom: r.id });
    },
    [createLocator]
  );

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
        onEdit={handleEdit}
        onClone={handleClone}
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
