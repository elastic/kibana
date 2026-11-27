/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { VERDICTS, VERDICT_LABELS } from '../../../../common/investigations/types';
import type { CaseStatusConfiguration } from '../../../../common/investigations/statuses';
import type {
  InvestigationPriority,
  InvestigationRecord,
  Verdict,
} from '../../../../common/investigations/types';
import { useGetTags } from '../../../containers/use_get_tags';
import { useInvestigationTypes } from '../../hooks';
import { useInvestigationsServices } from '../../services';
import * as sharedI18n from '../shared/translations';
import { AssigneesFilter } from './assignees_filter';
import { ColumnsPicker, FieldsFilter } from './fields_filter';
import { FilterPopover } from './filter_popover';
import type { FilterOption } from './filter_popover';
import { StatusFilter } from './status_filter';
import type { QueueFieldDef } from './use_queue_fields';
import * as i18n from './translations';
import { hasActiveFilters } from './use_queue_url_state';
import type { QueueState } from './use_queue_url_state';

const SEARCH_DEBOUNCE_MS = 300;
export const OWNER_UNASSIGNED_VALUE = 'unassigned';

const PRIORITY_OPTIONS: FilterOption[] = (['critical', 'high', 'medium', 'low'] as const).map(
  (value) => ({ value, label: sharedI18n.PRIORITY_LABELS[value] })
);

const VERDICT_OPTIONS: FilterOption[] = VERDICTS.map((value) => ({
  value,
  label: VERDICT_LABELS[value],
}));
/** Added to every record by the server; not a tag the user chose. */
const INTERNAL_TAG = 'investigation';

export interface QueueFiltersProps {
  state: QueueState;
  onChange: (change: Partial<QueueState>) => void;
  onClear: () => void;
  /** Records on screen, used to offer the owners seen so far. */
  records: InvestigationRecord[];
  /** Form fields of the investigation types, for the Fields filter and the optional columns. */
  fields: QueueFieldDef[];
  /** The configured statuses, grouped by category in the Status filter. */
  statuses: CaseStatusConfiguration[];
}

const useCurrentUsername = (): string | undefined => {
  const { security } = useInvestigationsServices();
  const [username, setUsername] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    security.authc
      .getCurrentUser()
      .then((user) => {
        if (isMounted) setUsername(user.username);
      })
      .catch(() => undefined);
    return () => {
      isMounted = false;
    };
  }, [security]);

  return username;
};

export const QueueFilters: React.FC<QueueFiltersProps> = ({
  state,
  onChange,
  onClear,
  records,
  fields,
  statuses,
}) => {
  const { data: typesData } = useInvestigationTypes();
  const { data: allTags } = useGetTags();
  const username = useCurrentUsername();
  const [searchText, setSearchText] = useState(state.search);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const appliedSearchRef = useRef(state.search);

  // Follow changes made outside the box, such as clearing filters.
  useEffect(() => {
    if (state.search !== appliedSearchRef.current) {
      appliedSearchRef.current = state.search;
      setSearchText(state.search);
    }
  }, [state.search]);

  useEffect(() => {
    if (searchText === appliedSearchRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      appliedSearchRef.current = searchText;
      onChangeRef.current({ search: searchText });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchText]);

  const typeOptions = useMemo<FilterOption[]>(() => {
    const names = (typesData?.types ?? []).map(({ name }) => name);
    state.investigationType.forEach((name) => {
      if (!names.includes(name)) names.push(name);
    });
    return names.map((name) => ({ value: name, label: name }));
  }, [typesData, state.investigationType]);

  const tagOptions = useMemo<FilterOption[]>(() => {
    const names = (allTags ?? []).filter((tag) => tag !== INTERNAL_TAG);
    state.tags.forEach((tag) => {
      if (!names.includes(tag)) names.push(tag);
    });
    return names.sort((a, b) => a.localeCompare(b)).map((name) => ({ value: name, label: name }));
  }, [allTags, state.tags]);

  const ownerOptions = useMemo<FilterOption[]>(() => {
    const options: FilterOption[] = [
      { value: OWNER_UNASSIGNED_VALUE, label: i18n.OWNER_UNASSIGNED },
    ];
    const seen = new Set<string>(options.map(({ value }) => value));
    const add = (value: string, label: string) => {
      if (!seen.has(value)) {
        seen.add(value);
        options.push({ value, label });
      }
    };
    if (username) add(username, i18n.OWNER_ME);
    records.forEach(({ owner }) => {
      if (owner) add(owner.id, owner.name);
    });
    if (state.owner) add(state.owner, state.owner);
    return options;
  }, [records, state.owner, username]);

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      wrap
      responsive={false}
      role="search"
      aria-label={i18n.FILTERS_LABEL}
      data-test-subj="investigationsQueueFilters"
    >
      <EuiFlexItem
        grow
        css={css`
          min-width: 240px;
          max-width: 420px;
        `}
      >
        <EuiFieldSearch
          fullWidth
          value={searchText}
          placeholder={i18n.SEARCH_PLACEHOLDER}
          aria-label={i18n.SEARCH_ARIA_LABEL}
          incremental={false}
          maxLength={1024}
          onChange={(event) => setSearchText(event.target.value)}
          data-test-subj="investigationsQueueSearch"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFilterGroup>
          <StatusFilter
            statuses={statuses}
            categories={state.status}
            keys={state.statusKeys}
            onChange={({ categories, keys }) => onChange({ status: categories, statusKeys: keys })}
          />
          <FilterPopover
            label={i18n.FILTER_PRIORITY}
            options={PRIORITY_OPTIONS}
            selected={state.priority}
            onChange={(selected) => onChange({ priority: selected as InvestigationPriority[] })}
            data-test-subj="investigationsFilterPriority"
          />
          <FilterPopover
            label={i18n.FILTER_TYPE}
            options={typeOptions}
            selected={state.investigationType}
            onChange={(selected) => onChange({ investigationType: selected })}
            searchable
            data-test-subj="investigationsFilterType"
          />
          <FilterPopover
            label={i18n.FILTER_VERDICT}
            options={VERDICT_OPTIONS}
            selected={state.verdict}
            onChange={(selected) => onChange({ verdict: selected as Verdict[] })}
            data-test-subj="investigationsFilterVerdict"
          />
          <AssigneesFilter
            selected={state.assignees}
            onChange={(assignees) => onChange({ assignees })}
          />
          <FilterPopover
            label={i18n.FILTER_TAGS}
            options={tagOptions}
            selected={state.tags}
            onChange={(selected) => onChange({ tags: selected })}
            searchable
            data-test-subj="investigationsFilterTags"
          />
          <FilterPopover
            label={i18n.FILTER_OWNER}
            options={ownerOptions}
            selected={state.owner ? [state.owner] : []}
            onChange={(selected) => onChange({ owner: selected[0] })}
            singleSelection
            data-test-subj="investigationsFilterOwner"
          />
          <FieldsFilter
            fields={fields}
            filters={state.fieldFilters}
            onChange={(fieldFilters) => onChange({ fieldFilters })}
          />
          <ColumnsPicker
            fields={fields}
            selected={state.columns}
            onChange={(columns) => onChange({ columns, pageIndex: state.pageIndex })}
          />
        </EuiFilterGroup>
      </EuiFlexItem>
      {hasActiveFilters(state) ? (
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty size="s" onClick={onClear} data-test-subj="investigationsClearFilters">
            {i18n.CLEAR_FILTERS}
          </EuiButtonEmpty>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};
QueueFilters.displayName = 'QueueFilters';
