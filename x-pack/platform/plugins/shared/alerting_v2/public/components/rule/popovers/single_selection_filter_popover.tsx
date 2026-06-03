/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import { css } from '@emotion/react';
import type { EuiSelectableOption } from '@elastic/eui';
import { useEuiTheme, EuiIcon, EuiPopover, EuiFilterButton, EuiSelectable } from '@elastic/eui';

export interface FilterPopoverOption {
  value: string;
  label: string;
  iconType?: string;
}

export const filterButtonStyles = (
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'],
  buttonWidth: number = 112
) => css`
  min-inline-size: ${buttonWidth}px;
  inline-size: ${buttonWidth}px;
  box-shadow: inset 0 0 0 1px ${euiTheme.colors.borderBaseSubdued};
  border-radius: ${euiTheme.border.radius.medium};

  .euiButtonEmpty__content {
    inline-size: 100%;
    justify-content: space-between;
  }

  .euiFilterButton__text {
    min-inline-size: 0;
  }
`;

export const SingleSelectionFilterPopover = ({
  label,
  options,
  dataTestSubj,
  popoverLabel,
  ariaLabel,
  buttonWidth = 112,
  value,
  onChange,
}: {
  label: string;
  options: FilterPopoverOption[];
  dataTestSubj: string;
  popoverLabel: string;
  ariaLabel: string;
  buttonWidth?: number;
  value: string;
  onChange: (value: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(
    () =>
      options.map(({ value: optionValue, label: optionLabel, iconType }) => ({
        key: optionValue,
        label: optionLabel,
        prepend: iconType ? <EuiIcon type={iconType} aria-hidden={true} /> : undefined,
        checked: value === optionValue ? 'on' : undefined,
        'data-test-subj': `${dataTestSubj}Option-${optionValue}`,
      })),
    [dataTestSubj, options, value]
  );

  const handleSelectionChange = (
    _options: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => {
    const nextValue = changedOption.key as string;
    onChange(value === nextValue ? '' : nextValue);
  };

  const activeCount = value ? 1 : 0;

  return (
    <EuiPopover
      aria-label={popoverLabel}
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
          css={filterButtonStyles(euiTheme, buttonWidth)}
          data-test-subj={dataTestSubj}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable
        aria-label={ariaLabel}
        searchable={false}
        options={selectableOptions}
        onChange={handleSelectionChange}
        listProps={{
          paddingSize: 's',
          showIcons: true,
          style: { minWidth: 240 },
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
