/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiPopover, EuiSelectable } from '@elastic/eui';

import {
  BYTE_SIZE_UNIT_OPTIONS,
  type ByteSizeUnit,
} from './max_field_size_utils';

export interface ByteSizeUnitButtonProps {
  value: ByteSizeUnit;
  onChange: (unit: ByteSizeUnit) => void;
  'aria-label': string;
  'data-test-subj': string;
}

export const ByteSizeUnitButton: FunctionComponent<ByteSizeUnitButtonProps> = ({
  value,
  onChange,
  'aria-label': ariaLabel,
  'data-test-subj': testSubj,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedLabel = useMemo(
    () => BYTE_SIZE_UNIT_OPTIONS.find((option) => option.value === value)?.text ?? value,
    [value]
  );

  const selectableOptions = useMemo(
    () =>
      BYTE_SIZE_UNIT_OPTIONS.map((option) => ({
        key: option.value,
        label: option.text,
        checked: value === option.value ? ('on' as const) : undefined,
        'data-test-subj': `${testSubj}-option-${option.value}`,
      })),
    [testSubj, value]
  );

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconSide="right"
          iconType="chevronSingleDown"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={ariaLabel}
          data-test-subj={testSubj}
        >
          {selectedLabel}
        </EuiButtonEmpty>
      }
      ownFocus
      panelPaddingSize="s"
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      <EuiSelectable
        singleSelection="always"
        listProps={{
          onFocusBadge: false,
          style: {
            minWidth: 130,
          },
        }}
        options={selectableOptions}
        onChange={(_newOptions, _event, changedOption) => {
          if (changedOption) {
            onChange(changedOption.key as ByteSizeUnit);
            setIsOpen(false);
          }
        }}
      >
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};
