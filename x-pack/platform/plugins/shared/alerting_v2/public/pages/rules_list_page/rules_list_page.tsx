/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageHeader,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  useEuiTheme,
  type Criteria,
  type EuiSelectableOption,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDebouncedValue } from '@kbn/react-hooks';
import type { ListRulesSortField, RuleApiResponse } from '../../services/rules_api';
import { useFetchRules } from '../../hooks/use_fetch_rules';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { paths } from '../../constants';
import { RulesListTableContainer } from './rules_list_table_container';
import type { RulesListTableSortField } from './rules_list_table';

const DEFAULT_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

interface FilterPopoverOption {
  value: string;
  label: string;
  iconType?: string;
}

const MODE_FILTER_OPTIONS: FilterPopoverOption[] = [
  {
    value: 'alert',
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.alert', {
      defaultMessage: 'Alerting',
    }),
    iconType: 'bell',
  },
  {
    value: 'signal',
    label: i18n.translate('xpack.alertingV2.rulesList.modeFilter.signal', {
      defaultMessage: 'Detect only',
    }),
    iconType: 'radar',
  },
];

const STATUS_FILTER_OPTIONS: FilterPopoverOption[] = [
  {
    value: 'true',
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.enabled', {
      defaultMessage: 'Enabled',
    }),
  },
  {
    value: 'false',
    label: i18n.translate('xpack.alertingV2.rulesList.statusFilter.disabled', {
      defaultMessage: 'Disabled',
    }),
  },
];

const SORT_FIELD_TO_TABLE_FIELD: Record<ListRulesSortField, RulesListTableSortField> = {
  kind: 'kind',
  enabled: 'enabled',
  name: 'metadata',
};

const TABLE_FIELD_TO_API_SORT_FIELD = Object.fromEntries(
  Object.entries(SORT_FIELD_TO_TABLE_FIELD).map(([api, table]) => [table, api])
) as Partial<Record<string, ListRulesSortField>>;

export const buildRulesListFilter = ({
  enabled,
  kind,
  tags,
}: {
  enabled?: string;
  kind?: string;
  tags?: string[];
}) => {
  const enabledValue = enabled === 'true' ? true : enabled === 'false' ? false : undefined;
  const kindValue = kind === 'alert' || kind === 'signal' ? kind : undefined;

  const tagClause =
    tags && tags.length > 0
      ? `(${tags
          .map((t) => `metadata.labels: "${t.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
          .join(' OR ')})`
      : undefined;

  const clauses = [
    enabledValue === undefined ? undefined : `enabled: ${enabledValue}`,
    tagClause,
    kindValue ? `kind: ${kindValue}` : undefined,
  ].filter((clause): clause is string => Boolean(clause));

  return clauses.length > 0 ? clauses.join(' AND ') : undefined;
};

const filterButtonStyles = (
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'],
  buttonWidth: number = 112
) => css`
  min-inline-size: ${buttonWidth}px;
  inline-size: ${buttonWidth}px;
  box-shadow: inset 0 0 0 1px ${euiTheme.colors.borderBaseSubdued};
  border-radius: ${euiTheme.border.radius.medium};

  .euiButtonEmpty__content {
    inline-size: 100%;
    justify-content: space-between;
  }

  .euiFilterButton__text {
    min-inline-size: 0;
  }
`;

const SingleSelectionFilterPopover = ({
  label,
  options,
  dataTestSubj,
  popoverLabel,
  ariaLabel,
  buttonWidth = 112,
  value,
  onChange,
}: {
  label: string;
  options: FilterPopoverOption[];
  dataTestSubj: string;
  popoverLabel: string;
  ariaLabel: string;
  buttonWidth?: number;
  value: string;
  onChange: (value: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      options.map(({ value: optionValue, label: optionLabel, iconType }) => ({
        key: optionValue,
        label: optionLabel,
        prepend: iconType ? <EuiIcon type={iconType} aria-hidden={true} /> : undefined,
        checked: value === optionValue ? 'on' : undefined,
        'data-test-subj': `${dataTestSubj}Option-${optionValue}`,
      })),
    [dataTestSubj, options, value]
  );

  const togglePopover = useCallback(() => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  }, []);

  const closePopover = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSelectionChange = useCallback(
    (_options: EuiSelectableOption[], __: unknown, changedOption: EuiSelectableOption) => {
      const nextValue = changedOption.key as string;
      onChange(value === nextValue ? '' : nextValue);
    },
    [onChange, value]
  );

  const activeCount = value ? 1 : 0;

  return (
    <EuiPopover
      aria-label={popoverLabel}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          css={filterButtonStyles(euiTheme, buttonWidth)}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={ariaLabel}
        searchable={false}
        options={selectableOptions}
        onChange={handleSelectionChange}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: { minWidth: 240 },
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

const StatusFilterPopover = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <SingleSelectionFilterPopover
    label={i18n.translate('xpack.alertingV2.rulesList.statusFilter.label', {
      defaultMessage: 'Status',
    })}
    options={STATUS_FILTER_OPTIONS}
    dataTestSubj="rulesListStatusFilter"
    popoverLabel={i18n.translate('xpack.alertingV2.rulesList.statusFilter.popoverLabel', {
      defaultMessage: 'Status filter options',
    })}
    ariaLabel={i18n.translate('xpack.alertingV2.rulesList.statusFilter.ariaLabel', {
      defaultMessage: 'Filter rules by status',
    })}
    buttonWidth={140}
    value={value}
    onChange={onChange}
  />
);

const ModeFilterPopover = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <SingleSelectionFilterPopover
    label={i18n.translate('xpack.alertingV2.rulesList.modeFilter.label', {
      defaultMessage: 'Mode',
    })}
    options={MODE_FILTER_OPTIONS}
    dataTestSubj="rulesListModeFilter"
    popoverLabel={i18n.translate('xpack.alertingV2.rulesList.modeFilter.popoverLabel', {
      defaultMessage: 'Mode filter options',
    })}
    ariaLabel={i18n.translate('xpack.alertingV2.rulesList.modeFilter.ariaLabel', {
      defaultMessage: 'Filter rules by mode',
    })}
    value={value}
    onChange={onChange}
  />
);

const TagsFilterPopover = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (values: string[]) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const selectedSet = new Set(value);
    return options.map((tag) => ({
      key: tag,
      label: tag,
      checked: selectedSet.has(tag) ? 'on' : undefined,
      'data-test-subj': `rulesListTagsFilterOption-${tag}`,
    }));
  }, [options, value]);

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);

  const handleSelectionChange = useCallback(
    (updatedOptions: EuiSelectableOption[]) => {
      const selected = updatedOptions
        .filter((opt) => opt.checked === 'on')
        .map((opt) => opt.key as string);
      onChange(selected);
    },
    [onChange]
  );

  const activeCount = value.length;

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2.rulesList.tagsFilter.popoverLabel', {
        defaultMessage: 'Tags filter options',
      })}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={togglePopover}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          css={filterButtonStyles(euiTheme)}
          data-test-subj="rulesListTagsFilter"
        >
          {i18n.translate('xpack.alertingV2.rulesList.tagsFilter.label', {
            defaultMessage: 'Tags',
          })}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={i18n.translate('xpack.alertingV2.rulesList.tagsFilter.ariaLabel', {
          defaultMessage: 'Filter rules by tags',
        })}
        searchable
        options={selectableOptions}
        onChange={handleSelectionChange}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: { minWidth: 240 },
        }}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

export const RulesListPage = () => {
  const { basePath } = useService(CoreStart('http'));

  useBreadcrumbs('rules_list');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PER_PAGE);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [modeFilter, setModeFilter] = useState('');
  const [sortField, setSortField] = useState<ListRulesSortField>('name');
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

  const { data, isLoading, isError, error } = useFetchRules({
    page,
    perPage,
    filter,
    search: debouncedSearch || undefined,
    sortField,
    sortOrder: sortDirection,
  });

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

  const availableTagOptions = useMemo(() => {
    const tagSet = new Set<string>(tagsFilter);
    for (const rule of data?.items ?? []) {
      for (const tag of rule.metadata.labels ?? []) {
        tagSet.add(tag);
      }
    }
    return [...tagSet].sort();
  }, [data?.items, tagsFilter]);

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
          <EuiButton
            key="create-rule"
            href={basePath.prepend(paths.ruleCreate)}
            data-test-subj="createRuleButton"
          >
            <FormattedMessage
              id="xpack.alertingV2.rulesList.createRuleButton"
              defaultMessage="Create rule"
            />
          </EuiButton>,
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
            items={data?.items ?? []}
            totalItemCount={data?.total ?? 0}
            page={page}
            perPage={perPage}
            search={debouncedSearch}
            hasActiveFilters={hasActiveFilters}
            sortField={SORT_FIELD_TO_TABLE_FIELD[sortField]}
            sortDirection={sortDirection}
            isLoading={isLoading}
            onTableChange={onTableChange}
          />
        </>
      ) : null}
    </div>
  );
};
