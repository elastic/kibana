/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiSelectable, EuiPopoverTitle } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

const INLINE_FILTER_POPOVER_MIN_WIDTH = 220;

interface InlineFilterPopoverProps {
  options: Array<{ label: string; value: string }>;
  selectedValues: string[];
  singleSelect: boolean;
  onSelectionChange: (values: string[]) => void;
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  emptyMessage: string;
  isLoading?: boolean;
  'data-test-subj': string;
}

export function InlineFilterPopover({
  options,
  selectedValues,
  singleSelect,
  onSelectionChange,
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
  emptyMessage,
  isLoading = false,
  'data-test-subj': dataTestSubj,
}: InlineFilterPopoverProps) {
  const selectableOptions: EuiSelectableOption[] = useMemo(
    () =>
      options.map((o) => ({
        key: o.value,
        label: o.label,
        checked: selectedValues.includes(o.value) ? ('on' as const) : undefined,
        'data-test-subj': `${dataTestSubj}-option-${o.value}`,
      })),
    [options, selectedValues, dataTestSubj]
  );

  const handleChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      const selected = newOptions.filter((o) => o.checked === 'on').map((o) => String(o.key));
      if (singleSelect) {
        onSelectionChange(selected.length ? [selected[selected.length - 1]] : []);
      } else {
        onSelectionChange(selected);
      }
    },
    [singleSelect, onSelectionChange]
  );

  return (
    <EuiSelectable
      options={selectableOptions}
      singleSelection={singleSelect}
      isPreFiltered
      {...(searchable &&
        onSearchChange && {
          searchable,
          searchProps: {
            value: searchValue,
            onChange: onSearchChange,
            compressed: true,
            placeholder: searchPlaceholder,
          },
        })}
      onChange={handleChange}
      isLoading={isLoading}
      listProps={{
        onFocusBadge: false,
      }}
      emptyMessage={emptyMessage}
      aria-label={i18n.INLINE_FILTER_POPOVER_ARIA_LABEL}
    >
      {(list, search) => (
        <div
          css={css`
            width: ${INLINE_FILTER_POPOVER_MIN_WIDTH}px;
          `}
        >
          {searchable && <EuiPopoverTitle paddingSize="s">{search}</EuiPopoverTitle>}
          {list}
        </div>
      )}
    </EuiSelectable>
  );
}
