/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { ContentList, ContentListProvider } from '@kbn/content-list';
import type { FieldDefinition } from '@kbn/content-list-provider';
import { useContentListItems } from '@kbn/content-list-provider';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { DeleteConfirmationModal } from '../../components/rule/modals/delete_confirmation_modal';
import { RuleSummaryFlyout } from '../../components/rule/flyouts';
import { paths } from '../../constants';
import { useBulkDeleteRules } from '../../hooks/use_bulk_delete_rules';
import { useBulkEnableRules, useBulkDisableRules } from '../../hooks/use_bulk_enable_disable_rules';
import { useDeleteRule } from '../../hooks/use_delete_rule';
import { useToggleRuleEnabled } from '../../hooks/use_toggle_rule_enabled';
import type { RuleApiResponse } from '../../services/rules_api';
import { UserCapabilities } from '../../services/user_capabilities';
import { RULES_CONTENT_LIST_ID } from '../../constants';
import { useRulesDataSource } from './rules_data_source';
import type { RuleContentListItem } from './rules_data_source';
import {
  MODE_FILTER_OPTIONS,
  RulesListTableContent,
  STATUS_FILTER_OPTIONS,
} from './rules_list_table_content';
import { ENABLED_FILTER_ID, KIND_FILTER_ID, TAG_FILTER_ID } from './rules_query_params';
import { useRulesSelectionMode } from './use_rules_selection_mode';

const enabledFieldDefinition: FieldDefinition = {
  fieldName: ENABLED_FILTER_ID,
  resolveIdToDisplay: (id) => STATUS_FILTER_OPTIONS.find((o) => o.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    STATUS_FILTER_OPTIONS.find((o) => o.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return STATUS_FILTER_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower)).map(
      (o) => o.key
    );
  },
};

const kindFieldDefinition: FieldDefinition = {
  fieldName: KIND_FILTER_ID,
  resolveIdToDisplay: (id) => MODE_FILTER_OPTIONS.find((o) => o.key === id)?.label ?? id,
  resolveDisplayToId: (displayValue) =>
    MODE_FILTER_OPTIONS.find((o) => o.label === displayValue)?.key,
  resolveFuzzyDisplayToIds: (partial) => {
    const lower = partial.toLowerCase();
    return MODE_FILTER_OPTIONS.filter((o) => o.label.toLowerCase().includes(lower)).map(
      (o) => o.key
    );
  },
};

const tagFieldDefinition: FieldDefinition = {
  fieldName: TAG_FILTER_ID,
  resolveIdToDisplay: (id) => id,
  resolveDisplayToId: (displayValue) => displayValue,
};

const FEATURES_FIELDS: FieldDefinition[] = [
  enabledFieldDefinition,
  kindFieldDefinition,
  tagFieldDefinition,
];

export interface RulesListTableProps {
  /**
   * Rendered inside the provider but outside {@link ContentList}, so it can
   * read Content List phase (e.g. AppHeader create-menu gating).
   */
  header?: ReactNode;
  /** Custom empty state rendered by Content List when there are no rules. */
  emptyState?: ReactNode;
  onEditInFlyout: (rule: RuleApiResponse) => void;
  onCloneInFlyout: (rule: RuleApiResponse) => void;
}

/**
 * Content List provider shell for the rules list — data source, sort/filter/
 * selection features, bulk mutations, and summary/delete modals.
 */
export const RulesListTable = ({
  header,
  emptyState,
  onEditInFlyout,
  onCloneInFlyout,
}: RulesListTableProps) => {
  const refetchRef = useRef<() => void>(() => {});
  const onRefetchReady = useCallback((refetchFn: () => void) => {
    refetchRef.current = refetchFn;
  }, []);

  const canWrite = useService(UserCapabilities).canWrite('rules');
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));

  const [ruleToDelete, setRuleToDelete] = useState<RuleApiResponse | null>(null);
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const deleteRuleMutation = useDeleteRule();
  const bulkDeleteMutation = useBulkDeleteRules();
  const bulkEnableMutation = useBulkEnableRules();
  const bulkDisableMutation = useBulkDisableRules();
  const toggleEnabledMutation = useToggleRuleEnabled();

  const dataSource = useRulesDataSource();
  const itemConfig = useMemo(() => ({}), []);

  const navigateToDetails = useCallback(
    (rule: RuleApiResponse) => navigateToUrl(basePath.prepend(paths.ruleDetails(rule.id))),
    [navigateToUrl, basePath]
  );

  return (
    <ContentListProvider
      id={RULES_CONTENT_LIST_ID}
      labels={{
        entity: i18n.translate('xpack.alertingV2.rulesList.entity', {
          defaultMessage: 'rule',
        }),
        entityPlural: i18n.translate('xpack.alertingV2.rulesList.entityPlural', {
          defaultMessage: 'rules',
        }),
      }}
      dataSource={dataSource}
      item={itemConfig}
      features={{
        sorting: {
          // Column.Name sorts by `title`; keep initialSort aligned so the header
          // shows the active sort state and the first click toggles direction.
          initialSort: { field: 'title', direction: 'asc' },
          fields: [
            {
              field: 'title',
              name: i18n.translate('xpack.alertingV2.rulesList.sort.name', {
                defaultMessage: 'Name',
              }),
            },
            {
              field: 'kind',
              name: i18n.translate('xpack.alertingV2.rulesList.sort.kind', {
                defaultMessage: 'Mode',
              }),
            },
            {
              field: 'enabled',
              name: i18n.translate('xpack.alertingV2.rulesList.sort.enabled', {
                defaultMessage: 'Enabled',
              }),
            },
          ],
        },
        pagination: { initialPageSize: 20 },
        search: true,
        selection: canWrite,
        fields: FEATURES_FIELDS,
      }}
    >
      {header}
      <ContentList emptyState={emptyState} data-test-subj="rulesList">
        <RulesListInner
          canWrite={canWrite}
          togglingRuleId={
            toggleEnabledMutation.isLoading ? toggleEnabledMutation.variables?.id : undefined
          }
          isBulkTogglingEnabled={bulkEnableMutation.isLoading || bulkDisableMutation.isLoading}
          onRefetchReady={onRefetchReady}
          onNavigateToDetails={navigateToDetails}
          onExpand={(rule) => setExpandedRuleId(rule.id)}
          onQuickEdit={onEditInFlyout}
          onEdit={onEditInFlyout}
          onClone={onCloneInFlyout}
          onDelete={setRuleToDelete}
          onToggleEnabled={(rule) =>
            toggleEnabledMutation.mutate(
              { id: rule.id, enabled: !rule.enabled },
              { onSuccess: () => refetchRef.current() }
            )
          }
          bulkEnableMutation={bulkEnableMutation}
          bulkDisableMutation={bulkDisableMutation}
          bulkDeleteMutation={bulkDeleteMutation}
          showBulkDeleteConfirm={showBulkDeleteConfirm}
          setShowBulkDeleteConfirm={setShowBulkDeleteConfirm}
          expandedRuleId={expandedRuleId}
          setExpandedRuleId={setExpandedRuleId}
          ruleToDelete={ruleToDelete}
          setRuleToDelete={setRuleToDelete}
          deleteRuleMutation={deleteRuleMutation}
          refetchRef={refetchRef}
        />
      </ContentList>
    </ContentListProvider>
  );
};

interface RulesListInnerProps {
  canWrite: boolean;
  togglingRuleId?: string;
  isBulkTogglingEnabled?: boolean;
  onRefetchReady: (refetch: () => void) => void;
  onNavigateToDetails: (rule: RuleApiResponse) => void;
  onExpand: (rule: RuleApiResponse) => void;
  onQuickEdit: (rule: RuleApiResponse) => void;
  onEdit: (rule: RuleApiResponse) => void;
  onClone: (rule: RuleApiResponse) => void;
  onDelete: (rule: RuleApiResponse) => void;
  onToggleEnabled: (rule: RuleApiResponse) => void;
  bulkEnableMutation: ReturnType<typeof useBulkEnableRules>;
  bulkDisableMutation: ReturnType<typeof useBulkDisableRules>;
  bulkDeleteMutation: ReturnType<typeof useBulkDeleteRules>;
  showBulkDeleteConfirm: boolean;
  setShowBulkDeleteConfirm: (show: boolean) => void;
  expandedRuleId: string | null;
  setExpandedRuleId: (id: string | null) => void;
  ruleToDelete: RuleApiResponse | null;
  setRuleToDelete: (rule: RuleApiResponse | null) => void;
  deleteRuleMutation: ReturnType<typeof useDeleteRule>;
  refetchRef: React.MutableRefObject<() => void>;
}

const RulesListInner = ({
  canWrite,
  togglingRuleId,
  isBulkTogglingEnabled,
  onRefetchReady,
  onNavigateToDetails,
  onExpand,
  onQuickEdit,
  onEdit,
  onClone,
  onDelete,
  onToggleEnabled,
  bulkEnableMutation,
  bulkDisableMutation,
  bulkDeleteMutation,
  showBulkDeleteConfirm,
  setShowBulkDeleteConfirm,
  expandedRuleId,
  setExpandedRuleId,
  ruleToDelete,
  setRuleToDelete,
  deleteRuleMutation,
  refetchRef,
}: RulesListInnerProps) => {
  const { items } = useContentListItems();
  const {
    selectedCount,
    totalItemCount,
    isAllSelected,
    selectAllMatching,
    clearSelection,
    getBulkParams,
  } = useRulesSelectionMode();

  const expandedRule = useMemo(() => {
    if (!expandedRuleId) {
      return null;
    }
    const match = items.find((item) => item.id === expandedRuleId) as
      | RuleContentListItem
      | undefined;
    return match?.rule ?? null;
  }, [expandedRuleId, items]);

  const handleBulkEnable = () => {
    bulkEnableMutation.mutate(getBulkParams(), {
      onSuccess: () => {
        clearSelection();
        refetchRef.current();
      },
    });
  };

  const handleBulkDisable = () => {
    bulkDisableMutation.mutate(getBulkParams(), {
      onSuccess: () => {
        clearSelection();
        refetchRef.current();
      },
    });
  };

  const onBulkDeleteConfirm = () => {
    bulkDeleteMutation.mutate(getBulkParams(), {
      onSuccess: () => {
        clearSelection();
        setShowBulkDeleteConfirm(false);
        refetchRef.current();
      },
      onError: () => {
        setShowBulkDeleteConfirm(false);
      },
    });
  };

  return (
    <>
      <RulesListTableContent
        canWrite={canWrite}
        togglingRuleId={togglingRuleId}
        isBulkTogglingEnabled={isBulkTogglingEnabled}
        selectedCount={selectedCount}
        totalItemCount={totalItemCount}
        isAllSelected={isAllSelected}
        onSelectAll={selectAllMatching}
        onClearSelection={clearSelection}
        onRefetchReady={onRefetchReady}
        onNavigateToDetails={onNavigateToDetails}
        onExpand={onExpand}
        onQuickEdit={onQuickEdit}
        onEdit={onEdit}
        onClone={onClone}
        onDelete={onDelete}
        onToggleEnabled={onToggleEnabled}
        onBulkEnable={handleBulkEnable}
        onBulkDisable={handleBulkDisable}
        onBulkDelete={() => setShowBulkDeleteConfirm(true)}
      />
      {expandedRule ? (
        <RuleSummaryFlyout
          rule={expandedRule}
          canWrite={canWrite}
          onClose={() => setExpandedRuleId(null)}
          onQuickEdit={(r) => {
            setExpandedRuleId(null);
            onQuickEdit(r);
          }}
          onEdit={(r) => {
            setExpandedRuleId(null);
            onEdit(r);
          }}
          onClone={(r) => {
            setExpandedRuleId(null);
            onClone(r);
          }}
          onDelete={(r) => onDelete(r)}
          onToggleEnabled={onToggleEnabled}
        />
      ) : null}
      {ruleToDelete ? (
        <DeleteConfirmationModal
          ruleName={ruleToDelete.metadata?.name ?? ruleToDelete.id}
          onCancel={() => setRuleToDelete(null)}
          onConfirm={() => {
            deleteRuleMutation.mutate(
              { id: ruleToDelete.id, name: ruleToDelete.metadata.name },
              {
                onSettled: () => {
                  setRuleToDelete(null);
                  setExpandedRuleId(null);
                  refetchRef.current();
                },
              }
            );
          }}
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
