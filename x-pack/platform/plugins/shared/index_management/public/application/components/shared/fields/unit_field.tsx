/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiSelectable, EuiPopover, EuiButtonEmpty } from '@elastic/eui';
import { UseField } from '../../../../shared_imports';

interface Props {
  path: string;
  disabled?: boolean;
  euiFieldProps?: Record<string, any>;
  options: Array<{
    value: string;
    text: string;
  }>;
}

export const UnitField: FunctionComponent<Props> = ({ path, disabled, options, euiFieldProps }) => {
  const [open, setOpen] = useState(false);

  return (
    <UseField key={path} path={path}>
      {(field) => {
        const onSelect = (option: string) => {
          field.setValue(option);
          setOpen(false);
        };

        return (
          <EuiPopover
            button={
              <EuiButtonEmpty
                size="xs"
                color="text"
                iconSide="right"
                iconType="arrowDown"
                onClick={() => setOpen((isOpen) => !isOpen)}
                data-test-subj="show-filters-button"
                disabled={disabled}
              >
                {options.find((timeUnitOption) => timeUnitOption.value === field.value)?.text ??
                  `${field.value}`}
              </EuiButtonEmpty>
            }
            ownFocus
            panelPaddingSize="none"
            isOpen={open}
            closePopover={() => setOpen(false)}
            {...euiFieldProps}
          >
            <EuiSelectable
              singleSelection="always"
              listProps={{
                onFocusBadge: false,
                style: {
                  minWidth: 130,
                },
              }}
              options={options.map((item) => ({
                key: item.value,
                label: item.text,
                checked: field.value === item.value ? 'on' : undefined,
                'data-test-subj': `filter-option-${item.value}`,
              }))}
              onChange={(newOptions, event, changedOption) => {
                if (changedOption) {
                  onSelect(changedOption.key);
                }
              }}
            >
              {(list) => list}
            </EuiSelectable>
          </EuiPopover>
        );
      }}
    </UseField>
  );
};
