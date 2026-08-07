/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiFilterGroup,
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  type EuiSelectableOption,
} from '@elastic/eui';
import type { DatasetFacets, DatasetMaturity } from '@kbn/evals-common';
import { MATURITY_LEVELS, getMaturityLabel } from './maturity';
import * as i18n from './translations';

interface FacetOption {
  value: string;
  label: string;
  count: number;
}

interface FacetFilterProps {
  label: string;
  ariaLabel: string;
  options: FacetOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  emptyMessage: string;
  /** `true` rather than `boolean` because `EuiSelectable` only accepts the literal. */
  searchable?: true;
  searchPlaceholder?: string;
  dataTestSubj: string;
}

const FacetFilter: React.FC<FacetFilterProps> = ({
  label,
  ariaLabel,
  options,
  selected,
  onChange,
  emptyMessage,
  searchable,
  searchPlaceholder,
  dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      options.map(({ value, label: optionLabel, count }) => ({
        key: value,
        label: optionLabel,
        checked: selected.includes(value) ? 'on' : undefined,
        append: <EuiNotificationBadge color="subdued">{count}</EuiNotificationBadge>,
      })),
    [options, selected]
  );

  return (
    <EuiPopover
      aria-label={ariaLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="arrowDown"
          badgeColor="success"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          numFilters={options.length}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={label}
        options={selectableOptions}
        onChange={(newOptions) =>
          onChange(
            newOptions
              .filter((option) => option.checked === 'on')
              .map((option) => String(option.key))
          )
        }
        emptyMessage={emptyMessage}
        searchable={searchable}
        searchProps={{ placeholder: searchPlaceholder, compressed: true }}
      >
        {(list, search) => (
          <div css={{ width: 280 }}>
            {search ? <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle> : null}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

/**
 * Turns facet buckets into filter options. Selected values are always offered,
 * even at a zero count, so a filter can still be turned off once the search term
 * excludes every dataset carrying it.
 */
const toFacetOptions = (
  buckets: DatasetFacets['tags'] | undefined,
  selected: string[],
  getLabel: (value: string) => string
): FacetOption[] => {
  const options = (buckets ?? []).map(({ value, count }) => ({
    value,
    label: getLabel(value),
    count,
  }));
  const known = new Set(options.map(({ value }) => value));

  return options.concat(
    selected
      .filter((value) => !known.has(value))
      .map((value) => ({ value, label: getLabel(value), count: 0 }))
  );
};

interface DatasetTagFiltersProps {
  facets?: DatasetFacets;
  selectedTags: string[];
  selectedMaturity: DatasetMaturity[];
  onTagsChange: (tags: string[]) => void;
  onMaturityChange: (maturity: DatasetMaturity[]) => void;
}

export const DatasetTagFilters: React.FC<DatasetTagFiltersProps> = ({
  facets,
  selectedTags,
  selectedMaturity,
  onTagsChange,
  onMaturityChange,
}) => {
  const tagOptions = useMemo(
    () => toFacetOptions(facets?.tags, selectedTags, (value) => value),
    [facets?.tags, selectedTags]
  );

  const maturityOptions = useMemo(() => {
    const counts = new Map((facets?.maturity ?? []).map(({ value, count }) => [value, count]));

    return MATURITY_LEVELS.filter(
      (level) => counts.has(level) || selectedMaturity.includes(level)
    ).map((level) => ({
      value: level,
      label: getMaturityLabel(level),
      count: counts.get(level) ?? 0,
    }));
  }, [facets?.maturity, selectedMaturity]);

  return (
    <EuiFilterGroup>
      <FacetFilter
        label={i18n.TAGS_LABEL}
        ariaLabel={i18n.FILTER_BY_TAGS}
        options={tagOptions}
        selected={selectedTags}
        onChange={onTagsChange}
        emptyMessage={i18n.NO_TAGS_TO_FILTER_BY}
        searchable
        searchPlaceholder={i18n.TAGS_FILTER_SEARCH_PLACEHOLDER}
        dataTestSubj="datasetTagsFilterButton"
      />
      <FacetFilter
        label={i18n.MATURITY_LABEL}
        ariaLabel={i18n.FILTER_BY_MATURITY}
        options={maturityOptions}
        selected={selectedMaturity}
        onChange={(values) => onMaturityChange(values as DatasetMaturity[])}
        emptyMessage={i18n.NO_MATURITY_TO_FILTER_BY}
        dataTestSubj="datasetMaturityFilterButton"
      />
    </EuiFilterGroup>
  );
};
