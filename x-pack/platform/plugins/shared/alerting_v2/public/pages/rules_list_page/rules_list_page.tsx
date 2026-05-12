/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiSpacer,
  type Criteria,
} from '@elastic/eui';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { PluginStart } from '@kbn/core-di';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { FindRulesSortField } from '@kbn/alerting-v2-schemas';
import { ComposeDiscoverFlyout } from '@kbn/alerting-v2-rule-form';
import type { RuleApiResponse } from '../../services/rules_api';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { useCreateRule } from '../../hooks/use_create_rule';
import { useUpdateRule } from '../../hooks/use_update_rule';
import { useFetchRuleTags } from '../../hooks/use_fetch_rule_tags';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';

import { RulesListTableContainer } from './rules_list_table_container';
import type { RulesListTableSortField } from './rules_list_table';
import { ModeFilterPopover } from '../../components/rule/popovers/mode_filter_popover';
import { StatusFilterPopover } from '../../components/rule/popovers/status_filter_popover';
import { TagsFilterPopover } from '../../components/rule/popovers/tag_filter_popover';
import { buildRulesListFilter } from './utils';

const DEFAULT_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

const SORT_FIELD_TO_TABLE_FIELD: Record<FindRulesSortField, RulesListTableSortField> = {
  kind: 'kind',
  enabled: 'enabled',
  name: 'metadata',
};

const TABLE_FIELD_TO_API_SORT_FIELD = Object.fromEntries(
  Object.entries(SORT_FIELD_TO_TABLE_FIELD).map(([api, table]) => [table, api])
) as Partial<Record<string, FindRulesSortField>>;

export const RulesListPage = () => {
  const http = useService(CoreStart('http'));
  const notifications = useService(CoreStart('notifications'));
  const application = useService(CoreStart('application'));
  const data = useService(PluginStart('data')) as DataPublicPluginStart;
  const dataViews = useService(PluginStart('dataViews')) as DataViewsPublicPluginStart;
  const lens = useService(PluginStart('lens')) as LensPublicStart;
  useBreadcrumbs('rules_list');

  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [editRule, setEditRule] = useState<RuleApiResponse | null>(null);
  const historyKey = useMemo(() => Symbol('ruleAuthoring'), []);
  const createRuleMutation = useCreateRule();
  const updateRuleMutation = useUpdateRule();
  const ruleFormServices = useMemo(
    () => ({ http, data, dataViews, notifications, application, lens }),
    [http, data, dataViews, notifications, application, lens]
  );

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

  const hasActiveFilters = Boolean(filter);

  return (
    <div>
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.alertingV2.rulesList.pageTitle"
            defaultMessage="Alerting V2 Rules"
          />
        }
        rightSideItems={[
          <EuiFlexGroup key="create-rule-group" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {/* Primary create button — navigates to the full-page form (existing flow) */}
              <EuiButton
                fill
                href="/app/management/alertingV2/rules/create"
                data-test-subj="createRuleButton"
              >
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.createRuleButton"
                  defaultMessage="Create rule"
                />
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Flyout create — opens the new stepped flyout experience */}
              <EuiButton
                onClick={() => setFlyoutOpen(true)}
                data-test-subj="createRuleFlyoutButton"
              >
                <FormattedMessage
                  id="xpack.alertingV2.rulesList.createRuleFlyoutButton"
                  defaultMessage="Create in flyout"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>,
        ]}
      />
      <EuiSpacer size="m" />
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
      {!isError ? (
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
            onTableChange={onTableChange}
            onEditInFlyout={(rule) => {
              setEditRule(rule);
              setFlyoutOpen(true);
            }}
          />
        </>
      ) : null}
      {flyoutOpen && (
        <ComposeDiscoverFlyout
          historyKey={historyKey}
          mode={editRule ? 'edit' : 'create'}
          rule={editRule ?? undefined}
          ruleId={editRule?.id}
          onClose={() => {
            setFlyoutOpen(false);
            setEditRule(null);
          }}
          services={ruleFormServices}
          onCreateRule={(payload) =>
            createRuleMutation.mutate(payload, {
              onSuccess: () => {
                setFlyoutOpen(false);
              },
            })
          }
          onUpdateRule={(id, payload) =>
            updateRuleMutation.mutate(
              { id, payload },
              {
                onSuccess: () => {
                  setFlyoutOpen(false);
                  setEditRule(null);
                },
              }
            )
          }
          isSaving={createRuleMutation.isLoading || updateRuleMutation.isLoading}
        />
      )}
    </div>
  );
};
