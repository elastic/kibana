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
import { i18n } from '@kbn/i18n';
import type { RuleApiResponse } from '../../services/rules_api';
import { UserCapabilities } from '../../services/user_capabilities';
import { useBulkSelect } from '../../hooks/use_bulk_select';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useBulkDeleteRules } from '../../hooks/use_bulk_delete_rules';
import { useBulkEnableRules, useBulkDisableRules } from '../../hooks/use_bulk_enable_disable_rules';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import { useBulkUpdateRuleApiKey } from '../../hooks/use_bulk_update_rule_api_key';
import { useRunRule } from '../../hooks/use_run_rule';
import { DeleteConfirmationModal } from '../../components/rule/modals/delete_confirmation_modal';
import { useRuleChangeHistoryModal } from '../../components/rule/modals/change_history';
import { UpdateApiKeyConfirmationModal } from '../../components/rule/modals/update_api_key_confirmation_modal';
import {
  BulkLinkActionPolicyModal,
  type BulkLinkActionPolicyResult,
  type BulkLinkRuleRow,
} from '../../components/rule/modals/bulk_link_action_policy_modal';
import { RuleSummaryFlyout } from '../../components/rule/flyouts';
import { paths } from '../../constants';
import type { RuleContentListItem } from './rules_data_source';
import { toRulesQueryParams } from './rules_query_params';
import { RulesListTable, type RulesListTableSortField } from './rules_list_table';

const API_SORT_TO_TABLE_FIELD: Record<string, RulesListTableSortField> = {
  name: 'metadata',
  kind: 'kind',
  enabled: 'enabled',
};

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
  const { toasts } = useService(CoreStart('notifications'));
  const { openChangeHistory, changeHistoryModal } = useRuleChangeHistoryModal();

  const { items: contentItems, totalItems, isLoading, hasActiveQuery } = useContentListItems();
  const { pageIndex, pageSize, pageSizeOptions, setPageIndex, setPageSize } =
    useContentListPagination();
  const { field: sortField, direction: sortDirection, setSort } = useContentListSort();
  const activeFilters = useActiveFilters();
  const { filter, search } = useMemo(() => toRulesQueryParams(activeFilters), [activeFilters]);

  const items = contentItems.map((item) => (item as RuleContentListItem).rule);

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
  const [ruleToUpdateApiKey, setRuleToUpdateApiKey] = useState<RuleApiResponse | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showBulkUpdateApiKeyConfirm, setShowBulkUpdateApiKeyConfirm] = useState(false);
  const [showBulkLinkActionPolicy, setShowBulkLinkActionPolicy] = useState(false);
  /** Prototype: local tag overlays applied after bulk link (not persisted). */
  const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({});

  const deleteRuleMutation = useDeleteRule();
  const bulkDeleteMutation = useBulkDeleteRules();
  const bulkEnableMutation = useBulkEnableRules();
  const bulkDisableMutation = useBulkDisableRules();
  const toggleEnabledMutation = useToggleRuleEnabled();
  const updateApiKeyMutation = useBulkUpdateRuleApiKey();
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

  const itemsWithTagOverrides = useMemo(
    () =>
      items.map((rule) => {
        const overrideTags = tagOverrides[rule.id];
        if (!overrideTags) {
          return rule;
        }
        return {
          ...rule,
          metadata: {
            ...rule.metadata,
            tags: overrideTags,
          },
        };
      }),
    [items, tagOverrides]
  );

  const expandedRule = expandedRuleId
    ? itemsWithTagOverrides.find((r) => r.id === expandedRuleId) ?? null
    : null;

  const selectedRulesForLink = useMemo((): BulkLinkRuleRow[] => {
    return itemsWithTagOverrides
      .filter((rule) => isRowSelected(rule.id))
      .map((rule) => ({
        id: rule.id,
        name: rule.metadata.name,
        tags: rule.metadata.tags ?? [],
      }));
  }, [itemsWithTagOverrides, isRowSelected]);

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

  const handleBulkUpdateApiKey = () => {
    setShowBulkUpdateApiKeyConfirm(true);
  };

  const onBulkUpdateApiKeyConfirm = () => {
    updateApiKeyMutation.mutate(getBulkParams(), {
      onSuccess: () => {
        onClearSelection();
        setShowBulkUpdateApiKeyConfirm(false);
      },
      onError: () => {
        setShowBulkUpdateApiKeyConfirm(false);
      },
    });
  };

  const handleBulkEnable = () => {
    bulkEnableMutation.mutate(getBulkParams(), { onSuccess: onClearSelection });
  };

  const handleBulkDisable = () => {
    bulkDisableMutation.mutate(getBulkParams(), { onSuccess: onClearSelection });
  };

  const handleBulkLinkActionPolicy = () => {
    setShowBulkLinkActionPolicy(true);
  };

  const onBulkLinkActionPolicyConfirm = (result: BulkLinkActionPolicyResult) => {
    // Prototype: apply tags locally so the list Tags column updates immediately.
    setTagOverrides((current) => {
      const next = { ...current };
      for (const ruleId of result.ruleIds) {
        const existing =
          next[ruleId] ??
          items.find((rule) => rule.id === ruleId)?.metadata.tags ??
          [];
        next[ruleId] = Array.from(new Set([...existing, ...result.tagsToAdd]));
      }
      return next;
    });
    toasts.addSuccess(
      i18n.translate('xpack.alertingV2.bulkLinkActionPolicy.success', {
        defaultMessage:
          'Linked {count, plural, one {# rule} other {# rules}} to “{policy}” with tags: {tags}',
        values: {
          count: selectedCount,
          policy: result.policy.name,
          tags: result.tagsToAdd.join(', '),
        },
      })
    );
    setShowBulkLinkActionPolicy(false);
    onClearSelection();
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

  const onUpdateApiKeyConfirm = () => {
    if (!ruleToUpdateApiKey) {
      return;
    }
    updateApiKeyMutation.mutate(
      { mode: 'by_ids', ids: [ruleToUpdateApiKey.id] },
      { onSettled: () => setRuleToUpdateApiKey(null) }
    );
  };

  return (
    <>
      <RulesListTable
        items={itemsWithTagOverrides}
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
        onBulkUpdateApiKey={handleBulkUpdateApiKey}
        onBulkLinkActionPolicy={handleBulkLinkActionPolicy}
        onNavigateToDetails={(r) => navigateToUrl(basePath.prepend(paths.ruleDetails(r.id)))}
        onExpand={(r) => setExpandedRuleId(r.id)}
        onQuickEdit={(r) => onEditInFlyout(r)}
        onEdit={(r) => onEditInFlyout(r)}
        onClone={(r) => onCloneInFlyout(r)}
        onDelete={(r) => setRuleToDelete(r)}
        onToggleEnabled={(r) => toggleEnabledMutation.mutate({ id: r.id, enabled: !r.enabled })}
        onUpdateApiKey={(r) => setRuleToUpdateApiKey(r)}
        onRun={(r) => runRuleMutation.mutate({ id: r.id })}
        onViewChangeHistory={(r) => openChangeHistory({ id: r.id, name: r.metadata.name })}
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
          onUpdateApiKey={(r) => setRuleToUpdateApiKey(r)}
          onViewChangeHistory={(r) => openChangeHistory({ id: r.id, name: r.metadata.name })}
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
      {ruleToUpdateApiKey ? (
        <UpdateApiKeyConfirmationModal
          ruleName={ruleToUpdateApiKey.metadata?.name ?? ruleToUpdateApiKey.id}
          onCancel={() => setRuleToUpdateApiKey(null)}
          onConfirm={onUpdateApiKeyConfirm}
          isLoading={updateApiKeyMutation.isLoading}
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
      {showBulkUpdateApiKeyConfirm ? (
        <UpdateApiKeyConfirmationModal
          ruleCount={selectedCount}
          onCancel={() => setShowBulkUpdateApiKeyConfirm(false)}
          onConfirm={onBulkUpdateApiKeyConfirm}
          isLoading={updateApiKeyMutation.isLoading}
        />
      ) : null}
      {showBulkLinkActionPolicy ? (
        <BulkLinkActionPolicyModal
          rules={selectedRulesForLink}
          ruleCount={selectedCount}
          onCancel={() => setShowBulkLinkActionPolicy(false)}
          onConfirm={onBulkLinkActionPolicyConfirm}
        />
      ) : null}
      {changeHistoryModal}
    </>
  );
};
