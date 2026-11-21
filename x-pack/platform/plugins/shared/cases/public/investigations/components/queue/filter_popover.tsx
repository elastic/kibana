/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterPopoverProps {
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Only one option can be selected. Selecting it again clears it. */
  singleSelection?: boolean;
  searchable?: boolean;
  'data-test-subj': string;
}

/** A filter button that opens a list of options to select from. */
export const FilterPopover: React.FC<FilterPopoverProps> = ({
  label,
  options,
  selected,
  onChange,
  singleSelection = false,
  searchable = false,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationsFilter' });

  const searchProps = searchable
    ? ({
        searchable: true,
        searchProps: { placeholder: i18n.FILTER_SEARCH_PLACEHOLDER, compressed: true },
      } as const)
    : ({ searchable: false } as const);

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      options.map(({ value, label: optionLabel }) => ({
        key: value,
        label: optionLabel,
        checked: selected.includes(value) ? 'on' : undefined,
        'data-test-subj': `${dataTestSubj}-option-${value}`,
      })),
    [options, selected, dataTestSubj]
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length > 0 ? selected.length : undefined}
          aria-label={
            selected.length > 0 ? i18n.FILTER_ACTIVE_COUNT(label, selected.length) : label
          }
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
    >
      <EuiSelectable
        aria-label={label}
        {...searchProps}
        singleSelection={singleSelection}
        options={selectableOptions}
        emptyMessage={i18n.FILTER_NO_OPTIONS}
        noMatchesMessage={i18n.FILTER_NO_MATCH}
        onChange={(changed) => {
          onChange(changed.filter(({ checked }) => checked === 'on').map(({ key }) => String(key)));
        }}
        listProps={{ onFocusBadge: false }}
      >
        {(list, search) => (
          <div
            css={css`
              width: ${euiTheme.base * 16}px;
            `}
          >
            <EuiPopoverTitle paddingSize="s">{search ?? label}</EuiPopoverTitle>
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
FilterPopover.displayName = 'FilterPopover';
