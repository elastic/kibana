/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { useEuiTheme, EuiPopover, EuiFilterButton, EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { filterButtonStyles } from './single_selection_filter_popover';

export const TagsFilterPopover = ({
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

  const handleSelectionChange = (updatedOptions: EuiSelectableOption[]) => {
    const selected = updatedOptions
      .filter((opt) => opt.checked === 'on')
      .map((opt) => opt.key as string);
    onChange(selected);
  };

  const activeCount = value.length;

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
