/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiFilterButton, EuiPopover, EuiSelectable } from '@elastic/eui';

const POPOVER_CONTENT_STYLE = { width: 250 };

export interface FilterOption {
  key: string;
  label: string;
}

interface SelectableFilterPopoverProps {
  label: string;
  options: FilterOption[];
  selectedKeys: string[];
  onSelectionChange: (keys: string[]) => void;
  isLoading?: boolean;
  'data-test-subj'?: string;
}

const SelectableFilterPopoverComponent: React.FC<SelectableFilterPopoverProps> = ({
  label,
  options,
  selectedKeys,
  onSelectionChange,
  isLoading,
  'data-test-subj': dataTestSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectableOptions = useMemo<EuiSelectableOption[]>(() => {
    const selectedSet = new Set(selectedKeys);

    return options.map(({ key, label: optionLabel }) => ({
      label: optionLabel,
      key,
      checked: selectedSet.has(key) ? 'on' : undefined,
    }));
  }, [options, selectedKeys]);

  const handleChange = useCallback(
    (_: EuiSelectableOption[], __: unknown, changedOption: EuiSelectableOption) => {
      const key = changedOption.key!;
      const isRemoving = selectedKeys.includes(key);
      const updated = isRemoving ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key];
      onSelectionChange(updated);
    },
    [selectedKeys, onSelectionChange]
  );

  const togglePopover = useCallback(() => setIsOpen((prev) => !prev), []);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const panelProps = useMemo(
    () => (dataTestSubj ? { 'data-test-subj': `${dataTestSubj}-popover` } : undefined),
    [dataTestSubj]
  );

  const activeCount = selectedKeys.length;

  const triggerButton = (
    <EuiFilterButton
      iconType="arrowDown"
      onClick={togglePopover}
      isLoading={isLoading}
      isSelected={isOpen}
      hasActiveFilters={activeCount > 0}
      numActiveFilters={activeCount}
      data-test-subj={dataTestSubj ? `${dataTestSubj}-button` : undefined}
    >
      {label}
    </EuiFilterButton>
  );

  return (
    <EuiPopover
      ownFocus
      button={triggerButton}
      isOpen={isOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      repositionOnScroll
      panelProps={panelProps}
    >
      <EuiSelectable aria-label={label} options={selectableOptions} onChange={handleChange}>
        {(list) => <div style={POPOVER_CONTENT_STYLE}>{list}</div>}
      </EuiSelectable>
    </EuiPopover>
  );
};

SelectableFilterPopoverComponent.displayName = 'SelectableFilterPopover';

export const SelectableFilterPopover = React.memo(SelectableFilterPopoverComponent);
