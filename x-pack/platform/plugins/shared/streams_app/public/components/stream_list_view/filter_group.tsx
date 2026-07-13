/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable, useGeneratedHtmlId } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';

interface FilterGroupProps {
  label: string;
  options: Array<{ key: string; label: string }>;
  onChange: (selectedKeys: string[]) => void;
}

export const FilterGroup = ({ label, options, onChange }: FilterGroupProps) => {
  const [isPopoverOpen, { off: closePopover, toggle }] = useBoolean(false);
  const filterGroupPopoverId = useGeneratedHtmlId({ prefix: 'filterGroupPopover' });

  const [items, setItems] = useState<EuiSelectableOption[]>(() =>
    options.map((opt) => ({ key: opt.key, label: opt.label }))
  );

  const handleChange = useCallback<Required<EuiSelectableProps>['onChange']>(
    (nextItems) => {
      setItems(nextItems);
      onChange(nextItems.filter((item) => item.checked === 'on').map((item) => item.key as string));
    },
    [onChange]
  );

  const activeCount = items.filter((item) => item.checked === 'on').length;

  return (
    <EuiPopover
      id={filterGroupPopoverId}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          badgeColor="success"
          onClick={toggle}
          isSelected={isPopoverOpen}
          numFilters={items.length}
          hasActiveFilters={activeCount > 0}
          numActiveFilters={activeCount}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="s"
    >
      <EuiSelectable aria-label={label} options={items} onChange={handleChange}>
        {(list) => (
          <div
            css={css`
              min-width: 220px;
            `}
          >
            {list}
          </div>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};
