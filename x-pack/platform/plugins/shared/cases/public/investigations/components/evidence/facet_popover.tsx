/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFilterButton,
  EuiNotificationBadge,
  EuiPopover,
  EuiPopoverTitle,
  EuiSelectable,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { css } from '@emotion/react';
import * as i18n from './translations';

export interface FacetOption {
  value: string;
  label: string;
  /** Number of matching items, shown next to the label. */
  count?: number;
}

export interface FacetPopoverProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  'data-test-subj': string;
}

/** A filter button that opens a multi-select list with counts from the server facets. */
export const FacetPopover: React.FC<FacetPopoverProps> = ({
  label,
  options,
  selected,
  onChange,
  searchable = false,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'investigationsEvidenceFacet' });

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      options.map(({ value, label: optionLabel, count }) => ({
        key: value,
        label: optionLabel,
        checked: selected.includes(value) ? 'on' : undefined,
        append:
          count === undefined ? undefined : (
            <EuiNotificationBadge color="subdued" size="s">
              {count.toLocaleString('en-US')}
            </EuiNotificationBadge>
          ),
        'data-test-subj': `${dataTestSubj}-option-${value}`,
      })),
    [options, selected, dataTestSubj]
  );

  const searchProps = searchable
    ? ({
        searchable: true,
        searchProps: { placeholder: i18n.FACET_SEARCH_PLACEHOLDER, compressed: true },
      } as const)
    : ({ searchable: false } as const);

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
          aria-label={selected.length > 0 ? i18n.FACET_ACTIVE_COUNT(label, selected.length) : label}
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
        options={selectableOptions}
        emptyMessage={i18n.FACET_NO_OPTIONS}
        noMatchesMessage={i18n.FACET_NO_MATCH}
        onChange={(changed) =>
          onChange(changed.filter(({ checked }) => checked === 'on').map(({ key }) => String(key)))
        }
        listProps={{ onFocusBadge: false }}
      >
        {(list, search) => (
          <div
            css={css`
              width: ${euiTheme.base * 18}px;
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
FacetPopover.displayName = 'FacetPopover';
