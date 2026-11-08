/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFilterButton,
  EuiIcon,
  EuiPanel,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface FilterOption {
  key: string;
  label: string;
  count: number;
  /** An EUI icon shown before the label. */
  icon?: string;
  /** What kind of thing the option is, shown after the label. */
  type?: string;
}

const TYPE_LABEL = i18n.translate('xpack.agenticInvestigations.timeline.entityType', {
  defaultMessage: 'Type',
});

/** A filter button with a popover of options and how many events each has, as Discover does. */
export const FilterPopover: React.FC<{
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  testSubj: string;
}> = ({ label, options, selected, onChange, searchable, searchPlaceholder, testSubj }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: testSubj });
  const typeOf = new Map(options.map(({ key, type }) => [key, type]));
  const selectable: EuiSelectableOption[] = options.map(
    ({ key, label: optionLabel, count, icon }) => ({
      key,
      label: optionLabel,
      checked: selected.includes(key) ? 'on' : undefined,
      ...(icon ? { prepend: <EuiIcon type={icon} aria-hidden={true} /> } : {}),
      append: <EuiBadge color="hollow">{count}</EuiBadge>,
    })
  );
  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          hasActiveFilters={selected.length > 0}
          numFilters={options.length}
          numActiveFilters={selected.length}
          data-test-subj={testSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={label}
        options={selectable}
        {...(searchable
          ? { searchable: true, searchProps: { placeholder: searchPlaceholder, compressed: true } }
          : {})}
        onChange={(next) =>
          onChange(next.flatMap(({ key, checked }) => (checked === 'on' && key ? [key] : [])))
        }
        listProps={{ showIcons: true, rowHeight: options.some(({ type }) => type) ? 48 : 32 }}
        // The name on one line and what kind of thing it is under it, so neither is cut short.
        renderOption={(option) => (
          <>
            <EuiText size="s">{option.label}</EuiText>
            {typeOf.get(option.key ?? '') && (
              <EuiText size="xs" color="subdued">
                {TYPE_LABEL}: {typeOf.get(option.key ?? '')}
              </EuiText>
            )}
          </>
        )}
        data-test-subj={`${testSubj}Options`}
      >
        {(list, search) => (
          <div
            css={css`
              width: 360px;
            `}
          >
            {search && <EuiPanel paddingSize="s">{search}</EuiPanel>}
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
