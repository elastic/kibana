/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';

interface FilterPopoverProps {
  label: string;
  ariaLabel: string;
  options: EuiSelectableOption[];
  numFilters: number;
  numActiveFilters: number;
  onChange: (options: EuiSelectableOption[]) => void;
}

const popoverContentCss = css`
  width: 200px;
`;

export const FilterPopover = ({
  label,
  ariaLabel,
  options,
  numFilters,
  numActiveFilters,
  onChange,
}: FilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={ariaLabel}
      button={
        <EuiFilterButton
          iconType="arrowDown"
          onClick={() => setIsOpen(!isOpen)}
          isSelected={isOpen}
          numFilters={numFilters}
          hasActiveFilters={numActiveFilters > 0}
          numActiveFilters={numActiveFilters}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
    >
      <EuiSelectable options={options} onChange={onChange}>
        {(list) => <div css={popoverContentCss}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};
