/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFilterButton, EuiPopover, EuiSelectable, useGeneratedHtmlId } from '@elastic/eui';
import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';

export interface SourceFilterOption<T extends string> {
  key: T;
  label: string;
}

interface SourceFilterProps<T extends string> {
  label: string;
  options: Array<SourceFilterOption<T>>;
  selectedValues: T[];
  onChange: (selectedValues: T[]) => void;
}

const selectableListStyles = css`
  min-width: 220px;
`;

export const SourceFilter = <T extends string>({
  label,
  options,
  selectedValues,
  onChange,
}: SourceFilterProps<T>) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'streamsSourcesFilterPopover' });
  const selectedValuesSet = React.useMemo(() => new Set(selectedValues), [selectedValues]);
  const selectableOptions = React.useMemo<EuiSelectableOption[]>(
    () =>
      options.map((option) => ({
        key: option.key,
        label: option.label,
        checked: selectedValuesSet.has(option.key) ? 'on' : undefined,
      })),
    [options, selectedValuesSet]
  );
  const onSelectableChange = React.useCallback<Required<EuiSelectableProps>['onChange']>(
    (nextOptions) => {
      onChange(
        nextOptions.filter((option) => option.checked === 'on').map((option) => option.key as T)
      );
    },
    [onChange]
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      button={
        <EuiFilterButton
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
          isSelected={isOpen}
          numFilters={options.length}
          hasActiveFilters={selectedValues.length > 0}
          numActiveFilters={selectedValues.length}
        >
          {label}
        </EuiFilterButton>
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="s"
    >
      <EuiSelectable aria-label={label} options={selectableOptions} onChange={onSelectableChange}>
        {(list) => <div css={selectableListStyles}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};
