/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  type Criteria,
} from '@elastic/eui';
import { AppHeader } from '@kbn/app-header';
import type { AppHeaderMenu } from '@kbn/app-header';
import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBoolean, useDebouncedValue } from '@kbn/react-hooks';
import type { FindRulesSortField } from '@kbn/alerting-v2-schemas';
import { UserCapabilities } from '../../services/user_capabilities';
import type { RuleApiResponse } from '../../services/rules_api';
import { ExperimentalBadge } from '../../components/experimental_badge';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { useFetchRuleTags } from '../../hooks/use_fetch_rule_tags';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { useComposeDiscoverFlyout } from '../../hooks/use_compose_discover_flyout';
import {
  useIsRuleManagementABSkillAvailable,
  useRuleManagementABSkillRequirements,
} from '../../hooks/use_is_rule_management_ab_skill_available';
import { useNavigateToAgentBuilder } from '../../hooks/use_navigate_to_agent_builder';

import { RulesListTableContainer } from './rules_list_table_container';
import type { RulesListTableSortField } from './rules_list_table';
import { ModeFilterPopover } from '../../components/rule/popovers/mode_filter_popover';
import { StatusFilterPopover } from '../../components/rule/popovers/status_filter_popover';
import { TagsFilterPopover } from '../../components/rule/popovers/tag_filter_popover';
import { buildRulesListFilter } from './utils';
import {
  RuleCreateOptionsPanel,
  getCreateWithAgentTooltipText,
} from '../../components/rule_create_options/rule_create_options_panel';
import { RuleCreateOptionsFlyout } from '../../components/rule_create_options/rule_create_options_flyout';

const DEFAULT_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

const RULES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.rulesList.pageTitle', {
  defaultMessage: 'Rules',
});

const getRulesListMenu = ({
  onCreateRule,
  onCreateEsqlRule,
  onCreateWithAgent,
  createWithAgentDisabled,
  createWithAgentTooltipText,
}: {
  onCreateRule: () => void;
  onCreateEsqlRule: () => void;
  onCreateWithAgent: () => void;
  createWithAgentDisabled?: boolean;
  createWithAgentTooltipText?: string;
}): AppHeaderMenu => ({
  primaryActionItem: {
    id: 'createRule',
    label: i18n.translate('xpack.alertingV2.rulesList.createRuleButton', {
      defaultMessage: 'Create rule',
    }),
    iconType: 'plusInCircle',
    run: onCreateRule,
    testId: 'createRuleButton',
    popoverTestId: 'createRulePopoverPanel',
    splitButtonProps: {
      iconType: 'arrowDown',
      secondaryButtonAriaLabel: i18n.translate('xpack.alertingV2.rulesList.createRuleMoreOptions', {
        defaultMessage: 'More create options',
      }),
      items: [
        {
          id: 'createEsqlRule',
          label: i18n.translate('xpack.alertingV2.rulesList.createEsqlRuleButton', {
            defaultMessage: 'Create ES|QL rule',
          }),
          iconType: 'productDiscover',
          order: 0,
          run: onCreateEsqlRule,
          testId: 'createEsqlRuleButton',
        },
        {
          id: 'createWithAgent',
          label: i18n.translate('xpack.alertingV2.rulesList.createWithAgentButton', {
            defaultMessage: 'Create with agent',
          }),
          iconType: 'sparkles' as const,
          order: 1,
          run: onCreateWithAgent,
          testId: 'createWithAgentButton',
          disableButton: createWithAgentDisabled,
          tooltipContent: createWithAgentTooltipText,
        },
      ],
    },
  },
});

const SORT_FIELD_TO_TABLE_FIELD: Record<FindRulesSortField, RulesListTableSortField> = {
  kind: 'kind',
  enabled: 'enabled',
  name: 'metadata',
};

const TABLE_FIELD_TO_API_SORT_FIELD = Object.fromEntries(
  Object.entries(SORT_FIELD_TO_TABLE_FIELD).map(([api, table]) => [table, api])
) as Partial<Record<string, FindRulesSortField>>;

export const RulesListPage = () => {
  useBreadcrumbs('rules_list');

  const canWrite = useService(UserCapabilities).canWrite('rules');

  const [
    isCreateOptionsFlyoutOpen,
    { on: openCreateOptionsFlyout, off: closeCreateOptionsFlyout },
  ] = useBoolean(false);
  const { flyout, openCreateFlyout, openCreateBuilderFlyout, openEditFlyout, openCloneFlyout } =
    useComposeDiscoverFlyout();
  const navigateToAgentBuilder = useNavigateToAgentBuilder();
  const isRuleManagementABSkillAvailable = useIsRuleManagementABSkillAvailable();
  const abSkillRequirements = useRuleManagementABSkillRequirements();
  // We always render the "Create with agent" entry points; when the skill is unavailable they
  // are shown disabled with a tooltip naming the missing prerequisite rather than hidden.
  const createWithAgentTooltipText = getCreateWithAgentTooltipText(abSkillRequirements);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [modeFilter, setModeFilter] = useState('');
  const [sortField, setSortField] = useState<FindRulesSortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);

  const filter = useMemo(
    () =>
      buildRulesListFilter({
        enabled: statusFilter,
        tags: tagsFilter,
        kind: modeFilter,
      }),
    [statusFilter, tagsFilter, modeFilter]
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const {
    data: rulesData,
    isLoading,
    isError,
    error,
  } = useFetchRules({
    page,
    perPage,
    filter,
    search: debouncedSearch || undefined,
    sortField,
    sortOrder: sortDirection,
  });

  const { data: allTags } = useFetchRuleTags();

  const onTableChange = ({ page: tablePage, sort }: Criteria<RuleApiResponse>) => {
    if (tablePage) {
      setPage(tablePage.index + 1);
      setPerPage(tablePage.size);
    }

    if (sort) {
      const nextSortField = TABLE_FIELD_TO_API_SORT_FIELD[sort.field as string];
      if (nextSortField) {
        const sortChanged = nextSortField !== sortField || sort.direction !== sortDirection;
        setSortField(nextSortField);
        setSortDirection(sort.direction);
        if (sortChanged) {
          setPage(1);
        }
      }
    }
  };

  const availableTagOptions = allTags ?? [];
  const hasActiveFilters = Boolean(filter) || Boolean(searchInput.trim());
  const isInitialLoad = isLoading && rulesData === undefined;
  const hasRules = (rulesData?.total ?? 0) > 0;
  const showEmptyState = !isInitialLoad && !isError && !hasRules && !hasActiveFilters;
  const onCreateEsqlRuleFromOptionsFlyout = () => {
    closeCreateOptionsFlyout();
    openCreateFlyout();
  };
  const onCreateWithAgentFromOptionsFlyout = () => {
    closeCreateOptionsFlyout();
    navigateToAgentBuilder();
  };
  const onCreateThresholdRuleFromOptionsFlyout = () => {
    closeCreateOptionsFlyout();
    openCreateBuilderFlyout('threshold');
  };

  const showHeaderMenu = (hasRules || hasActiveFilters) && canWrite;
  const headerMenu = useMemo(
    () =>
      showHeaderMenu
        ? getRulesListMenu({
            onCreateRule: openCreateOptionsFlyout,
            onCreateEsqlRule: openCreateFlyout,
            onCreateWithAgent: navigateToAgentBuilder,
            createWithAgentDisabled: !isRuleManagementABSkillAvailable,
            createWithAgentTooltipText,
          })
        : undefined,
    [
      showHeaderMenu,
      openCreateOptionsFlyout,
      openCreateFlyout,
      navigateToAgentBuilder,
      isRuleManagementABSkillAvailable,
      createWithAgentTooltipText,
    ]
  );

  return (
    <div>
      <AppHeader
        sticky={false}
        title={RULES_LIST_PAGE_TITLE}
        titleAppend={<ExperimentalBadge />}
        padding={{ bleed: 'm' }}
        menu={headerMenu}
      />
      <EuiSpacer size="m" />
      {isInitialLoad ? (
        <EuiFlexGroup justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="l" data-test-subj="rulesListLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      {isError ? (
        <>
          <EuiCallOut
            announceOnMount
            title={
              <FormattedMessage
                id="xpack.alertingV2.rulesList.loadErrorTitle"
                defaultMessage="Failed to load rules"
              />
            }
            color="danger"
            iconType="error"
          >
            {error instanceof Error ? error.message : String(error)}
          </EuiCallOut>
          <EuiSpacer />
        </>
      ) : null}
      {showEmptyState ? (
        canWrite ? (
          <RuleCreateOptionsPanel
            onCreateEsqlRule={openCreateFlyout}
            onCreateWithAgent={navigateToAgentBuilder}
            createWithAgentDisabled={!isRuleManagementABSkillAvailable}
            createWithAgentTooltipText={createWithAgentTooltipText}
            onCreateThresholdRule={onCreateThresholdRuleFromOptionsFlyout}
          />
        ) : (
          <EuiEmptyPrompt
            iconType="bell"
            data-test-subj="rulesListReadOnlyEmpty"
            title={
              <h2>
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.readOnlyEmptyTitle"
                  defaultMessage="No rules"
                />
              </h2>
            }
            body={
              <p>
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.readOnlyEmptyBody"
                  defaultMessage="There are no rules to display."
                />
              </p>
            }
          />
        )
      ) : null}
      {hasRules || hasActiveFilters ? (
        <>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFieldSearch
                fullWidth
                isClearable
                value={searchInput}
                placeholder={i18n.translate('xpack.alertingV2.rulesList.searchPlaceholder', {
                  defaultMessage: 'Search rules',
                })}
                onChange={(event) => setSearchInput(event.target.value)}
                data-test-subj="rulesListSearchBar"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFilterGroup>
                <StatusFilterPopover value={statusFilter} onChange={setStatusFilter} />
                <TagsFilterPopover
                  options={availableTagOptions}
                  value={tagsFilter}
                  onChange={setTagsFilter}
                />
                <ModeFilterPopover value={modeFilter} onChange={setModeFilter} />
              </EuiFilterGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
          <RulesListTableContainer
            items={rulesData?.items ?? []}
            totalItemCount={rulesData?.total ?? 0}
            page={page}
            perPage={perPage}
            search={debouncedSearch}
            filter={filter}
            hasActiveFilters={hasActiveFilters}
            sortField={SORT_FIELD_TO_TABLE_FIELD[sortField]}
            sortDirection={sortDirection}
            isLoading={isLoading}
            canWrite={canWrite}
            onTableChange={onTableChange}
            onEditInFlyout={openEditFlyout}
            onCloneInFlyout={openCloneFlyout}
          />
        </>
      ) : null}
      {isCreateOptionsFlyoutOpen ? (
        <RuleCreateOptionsFlyout
          onClose={closeCreateOptionsFlyout}
          onCreateEsqlRule={onCreateEsqlRuleFromOptionsFlyout}
          onCreateWithAgent={onCreateWithAgentFromOptionsFlyout}
          createWithAgentDisabled={!isRuleManagementABSkillAvailable}
          createWithAgentTooltipText={createWithAgentTooltipText}
          onCreateThresholdRule={onCreateThresholdRuleFromOptionsFlyout}
        />
      ) : null}
      {flyout}
    </div>
  );
};
