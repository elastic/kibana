/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldSearch,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  EVIDENCE_TYPE_LABELS,
  INDICATOR_TYPE_LABELS,
} from '../../../../common/investigations/types';
import type {
  EvidenceType,
  IndicatorType,
  ItemFacets,
} from '../../../../common/investigations/types';
import { ICONS } from '../../icons';
import { FacetPopover } from './facet_popover';
import type { FacetOption } from './facet_popover';
import { hasActiveEvidenceFilters } from './evidence_state';
import type { EvidenceState } from './evidence_state';
import * as i18n from './translations';

const SEARCH_DEBOUNCE_MS = 300;

export interface EvidenceToolbarProps {
  state: EvidenceState;
  facets: ItemFacets | undefined;
  /** Set when the record has a handoff, so "New since last handoff" can be offered. */
  hasHandoff: boolean;
  newSinceHandoffCount: number | undefined;
  onChange: (change: Partial<EvidenceState>) => void;
  onClear: () => void;
  onExport: () => void;
  onImport: () => void;
  onAdd: () => void;
}

const toOptions = <T extends string>(
  counts: Record<string, number> | undefined,
  selected: T[],
  labels: Record<T, string>
): FacetOption[] => {
  const known = Object.entries(counts ?? {}).map(([value, count]) => ({ value, count }));
  selected.forEach((value) => {
    if (!known.some((entry) => entry.value === value)) {
      known.push({ value, count: 0 });
    }
  });
  return known
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .map(({ value, count }) => ({
      value,
      count,
      label: value in labels ? labels[value as T] : value,
    }));
};

export const EvidenceToolbar: React.FC<EvidenceToolbarProps> = ({
  state,
  facets,
  hasHandoff,
  newSinceHandoffCount,
  onChange,
  onClear,
  onExport,
  onImport,
  onAdd,
}) => {
  const [searchText, setSearchText] = useState(state.search);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const appliedSearchRef = useRef(state.search);

  // Follow changes made outside the box, such as clearing the filters.
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

  const typeOptions = useMemo(
    () => toOptions<EvidenceType>(facets?.type, state.types, EVIDENCE_TYPE_LABELS),
    [facets?.type, state.types]
  );
  const indicatorTypeOptions = useMemo(
    () =>
      toOptions<IndicatorType>(facets?.indicator_type, state.indicatorTypes, INDICATOR_TYPE_LABELS),
    [facets?.indicator_type, state.indicatorTypes]
  );
  const addedByOptions = useMemo<FacetOption[]>(() => {
    const options = (facets?.added_by ?? []).map(({ id, name, count }) => ({
      value: id,
      label: name,
      count,
    }));
    state.addedBy.forEach((id) => {
      if (!options.some(({ value }) => value === id)) {
        options.push({ value: id, label: id, count: 0 });
      }
    });
    return options;
  }, [facets?.added_by, state.addedBy]);

  return (
    <div
      role="search"
      aria-label={i18n.TOOLBAR_LABEL}
      data-test-subj="investigationEvidenceToolbar"
    >
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem
          grow
          css={css`
            min-width: 200px;
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
            data-test-subj="investigationEvidenceSearch"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType={ICONS.upload}
            onClick={onImport}
            data-test-subj="investigationEvidenceImport"
          >
            {i18n.IMPORT_CSV}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            iconType={ICONS.export}
            onClick={onExport}
            data-test-subj="investigationEvidenceExport"
          >
            {i18n.EXPORT}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType={ICONS.add}
            onClick={onAdd}
            data-test-subj="investigationEvidenceAdd"
          >
            {i18n.ADD_EVIDENCE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiFilterGroup>
            <FacetPopover
              label={i18n.FILTER_TYPE}
              options={typeOptions}
              selected={state.types}
              onChange={(selected) => onChange({ types: selected as EvidenceType[] })}
              data-test-subj="investigationEvidenceFilterType"
            />
            {indicatorTypeOptions.length > 0 ? (
              <FacetPopover
                label={i18n.FILTER_INDICATOR_TYPE}
                options={indicatorTypeOptions}
                selected={state.indicatorTypes}
                onChange={(selected) => onChange({ indicatorTypes: selected as IndicatorType[] })}
                data-test-subj="investigationEvidenceFilterIndicatorType"
              />
            ) : null}
            <FacetPopover
              label={i18n.FILTER_ADDED_BY}
              options={addedByOptions}
              selected={state.addedBy}
              onChange={(selected) => onChange({ addedBy: selected })}
              searchable
              data-test-subj="investigationEvidenceFilterAddedBy"
            />
            {hasHandoff ? (
              <EuiFilterButton
                hasActiveFilters={state.sinceHandoff}
                isToggle
                isSelected={state.sinceHandoff}
                numFilters={newSinceHandoffCount}
                onClick={() => onChange({ sinceHandoff: !state.sinceHandoff })}
                data-test-subj="investigationEvidenceFilterNew"
              >
                {i18n.FILTER_NEW_SINCE_HANDOFF}
              </EuiFilterButton>
            ) : null}
          </EuiFilterGroup>
        </EuiFlexItem>
        {hasActiveEvidenceFilters(state) ? (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              onClick={onClear}
              data-test-subj="investigationEvidenceClearFilters"
            >
              {i18n.CLEAR_FILTERS}
            </EuiButtonEmpty>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </div>
  );
};
EvidenceToolbar.displayName = 'EvidenceToolbar';
