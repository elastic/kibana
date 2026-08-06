/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFilterButton,
  EuiPopover,
  EuiSelectable,
  useGeneratedHtmlId,
  type EuiSelectableOption,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';

interface MultiSelectFilterOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface MultiSelectFilterProps<TValue extends string> {
  label: string;
  options: ReadonlyArray<MultiSelectFilterOption<TValue>>;
  selected: readonly TValue[];
  onChange: (selected: TValue[]) => void;
  'data-test-subj': string;
}

const isChecked = <TValue extends string>(
  option: EuiSelectableOption<MultiSelectFilterOption<TValue>>
) => option.checked === 'on';

// Without a floor the popover shrinks to the filter button, truncating labels.
const MIN_POPOVER_WIDTH = 240;

export const MultiSelectFilter = <TValue extends string>({
  label,
  options,
  selected,
  onChange,
  'data-test-subj': dataTestSubj,
}: MultiSelectFilterProps<TValue>) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverId = useGeneratedHtmlId({ prefix: 'aiIndexListFilter' });

  const closePopover = useCallback(() => setIsOpen(false), []);

  const handleChange = useCallback(
    (nextOptions: Array<EuiSelectableOption<MultiSelectFilterOption<TValue>>>) => {
      onChange(nextOptions.filter(isChecked).map(({ value }) => value));
    },
    [onChange]
  );

  const selectableOptions = useMemo(
    () =>
      options.map((option) => ({
        ...option,
        key: option.value,
        checked: selected.includes(option.value) ? ('on' as const) : undefined,
        'data-test-subj': `${dataTestSubj}Option-${option.value}`,
      })),
    [dataTestSubj, options, selected]
  );

  return (
    <EuiPopover
      id={popoverId}
      aria-label={label}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          data-test-subj={dataTestSubj}
          iconType="chevronSingleDown"
          isSelected={isOpen}
          numFilters={options.length}
          hasActiveFilters={selected.length > 0}
          numActiveFilters={selected.length}
          onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        >
          {label}
        </EuiFilterButton>
      }
    >
      <EuiSelectable<MultiSelectFilterOption<TValue>>
        aria-label={label}
        options={selectableOptions}
        onChange={handleChange}
        listProps={{ paddingSize: 's', isVirtualized: false }}
      >
        {(list) => <div css={{ minWidth: MIN_POPOVER_WIDTH }}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};
