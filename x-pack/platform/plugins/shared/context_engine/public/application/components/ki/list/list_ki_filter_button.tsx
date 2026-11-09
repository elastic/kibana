/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';

export type ListKiFilterOption<TValue extends string> = EuiSelectableOption & { value: TValue };

interface ListKiFilterButtonProps<TValue extends string> {
  buttonLabel: string;
  legend: string;
  panelMinWidth: string;
  buttonMinWidth: string;
  options: Array<ListKiFilterOption<TValue>>;
  hasActiveFilters: boolean;
  numActiveFilters: number;
  onChange: (value: TValue) => void;
  buttonTestSubj: string;
}

export const ListKiFilterButton = <TValue extends string>({
  buttonLabel,
  legend,
  panelMinWidth,
  buttonMinWidth,
  options,
  hasActiveFilters,
  numActiveFilters,
  onChange,
  buttonTestSubj,
}: ListKiFilterButtonProps<TValue>) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handleChange = (updatedOptions: Array<ListKiFilterOption<TValue>>) => {
    const selected = updatedOptions.find(({ checked }) => checked === 'on');
    if (!selected) {
      return;
    }
    onChange(selected.value);
    setIsPopoverOpen(false);
  };

  const button = (
    <EuiFilterButton
      iconType="chevronSingleDown"
      isSelected={isPopoverOpen}
      hasActiveFilters={hasActiveFilters}
      numActiveFilters={numActiveFilters}
      css={css({ minWidth: buttonMinWidth })}
      onClick={() => setIsPopoverOpen((open) => !open)}
      data-test-subj={buttonTestSubj}
    >
      {buttonLabel}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={legend}
    >
      <div style={{ minWidth: panelMinWidth }}>
        <EuiSelectable<ListKiFilterOption<TValue>>
          singleSelection="always"
          aria-label={legend}
          options={options}
          onChange={handleChange}
          listProps={{ paddingSize: 's' }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </EuiPopover>
  );
};
