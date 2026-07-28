/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  useEuiTheme,
  EuiPopover,
  EuiFilterButton,
  EuiSelectable,
  EuiText,
  EuiPopoverFooter,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { filterButtonStyles } from './single_selection_filter_popover';

const MAX_TAGS_CAP = 20;

export const TagsFilterPopover = ({
  options,
  value,
  isLoading,
  search,
  onSearchChange,
  onChange,
}: {
  options: string[];
  value: string[];
  isLoading: boolean;
  search: string;
  onSearchChange: (search: string) => void;
  onChange: (values: string[]) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const apiTagSet = new Set(options);
    const selectedSet = new Set(value);

    // Prepend selected tags absent from the current capped/searched result
    const synthetic = value
      .filter((t) => !apiTagSet.has(t))
      .map((tag) => ({
        key: tag,
        label: tag,
        checked: 'on' as const,
        'data-test-subj': `rulesListTagsFilterOption-${tag}`,
      }));

    const fromApi = options.map((tag) => ({
      key: tag,
      label: tag,
      checked: (selectedSet.has(tag) ? 'on' : undefined) as EuiSelectableOption['checked'],
      'data-test-subj': `rulesListTagsFilterOption-${tag}`,
    }));

    return [...synthetic, ...fromApi];
  }, [options, value]);

  const handleSelectionChange = (updatedOptions: EuiSelectableOption[]) => {
    const selected = updatedOptions
      .filter((opt) => opt.checked === 'on')
      .map((opt) => opt.key as string);
    onChange(selected);
  };

  const activeCount = value.length;
  const showCapGuidance = options.length >= MAX_TAGS_CAP;

  return (
    <EuiPopover
      aria-label={i18n.translate('xpack.alertingV2.rulesList.tagsFilter.popoverLabel', {
        defaultMessage: 'Tags filter options',
      })}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      repositionOnScroll
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen((prev) => !prev)}
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
        isLoading={isLoading}
        isPreFiltered
        options={selectableOptions}
        onChange={handleSelectionChange}
        searchable
        searchProps={{
          value: search,
          onChange: (searchValue: string) => onSearchChange(searchValue),
          'data-test-subj': 'rulesListTagsFilterSearch',
        }}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: { minWidth: 240 },
        }}
      >
        {(list, searchEl) => (
          <>
            {searchEl}
            {list}
          </>
        )}
      </EuiSelectable>
      {showCapGuidance && (
        <EuiPopoverFooter paddingSize="s">
          <EuiText size="xs" color="subdued" data-test-subj="rulesListTagsFilterCapGuidance">
            {i18n.translate('xpack.alertingV2.rulesList.tagsFilter.capGuidance', {
              defaultMessage: 'Showing first {cap} most-used — type to search',
              values: { cap: MAX_TAGS_CAP },
            })}
          </EuiText>
        </EuiPopoverFooter>
      )}
    </EuiPopover>
  );
};
