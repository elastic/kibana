/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiFilterButton, EuiPopover } from '@elastic/eui';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { useFetchEpisodeTagOptions } from '../../hooks/use_fetch_episode_tag_options';
import { InlineFilterPopover } from './inline_filter_popover';
import * as i18n from './translations';

interface AlertEpisodesTagFilterProps {
  selectedTags?: string[] | null;
  onTagsChange: (tags: string[] | undefined) => void;
  services: { expressions: ExpressionsStart };
  timeRange: TimeRange;
  'data-test-subj'?: string;
}

export function AlertEpisodesTagFilter({
  selectedTags,
  onTagsChange,
  services,
  timeRange,
  'data-test-subj': dataTestSubj = 'tagFilter',
}: AlertEpisodesTagFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: tagOptions = [], isLoading } = useFetchEpisodeTagOptions({ services, timeRange });

  const allOptions = useMemo(() => {
    const fromApi = tagOptions.map((t) => ({ label: t, value: t }));
    const selected = selectedTags ?? [];
    const apiValues = new Set(tagOptions);
    const missingSelected = selected
      .filter((t) => !apiValues.has(t))
      .map((t) => ({ label: t, value: t }));
    return [...missingSelected, ...fromApi];
  }, [tagOptions, selectedTags]);

  const options = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return allOptions;
    }
    return allOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [allOptions, search]);

  const handleSelectionChange = useCallback(
    (values: string[]) => {
      onTagsChange(values.length > 0 ? values : undefined);
    },
    [onTagsChange]
  );

  const selectedValues = selectedTags ?? [];
  const activeCount = selectedValues.length;

  return (
    <EuiPopover
      aria-label={i18n.TAG_FILTER_ARIA_LABEL}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={activeCount > 0}
          numFilters={allOptions.length}
          numActiveFilters={activeCount > 0 ? activeCount : undefined}
          data-test-subj={`${dataTestSubj}-button`}
        >
          {i18n.TAG_FILTER_LABEL}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downLeft"
      panelPaddingSize="none"
    >
      <InlineFilterPopover
        options={options}
        selectedValues={selectedValues}
        singleSelect={false}
        onSelectionChange={handleSelectionChange}
        searchable={true}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={i18n.TAG_FILTER_SEARCH_PLACEHOLDER}
        emptyMessage={i18n.TAG_FILTER_NO_MATCH}
        isLoading={isLoading}
        data-test-subj={`${dataTestSubj}-popover`}
      />
    </EuiPopover>
  );
}
