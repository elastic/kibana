/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { EuiButton, EuiPopover, EuiSelectable } from '@elastic/eui';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { NumericField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { timeUnits, extraTimeUnits } from '../constants';

export const RetentionPeriodField: FunctionComponent<{ disabled: boolean }> = ({ disabled }) => {
  const [open, setOpen] = useState(false);
  const allUnits = useMemo(() => [...timeUnits, ...extraTimeUnits], []);
  const labelFor = useCallback(
    (value: string) => allUnits.find((unit) => unit.value === value)?.text ?? value,
    [allUnits]
  );
  return (
    <UseField
      path="retentionPeriodValue"
      component={NumericField}
      componentProps={{
        fullWidth: true,
        euiFieldProps: {
          disabled,
          'data-test-subj': `selectFailureStorePeriodValue`,
          min: 1,
          append: (
            <UseField key={'retentionPeriodUnit'} path={'retentionPeriodUnit'}>
              {(field) => {
                const onSelect = (option: string) => {
                  field.setValue(option);
                  setOpen(false);
                };

                return (
                  <EuiPopover
                    isOpen={open}
                    panelPaddingSize="none"
                    closePopover={() => setOpen(false)}
                    button={
                      <EuiButton
                        data-test-subj="selectFailureStoreRetentionPeriodUnit"
                        disabled={disabled}
                        iconType="arrowDown"
                        iconSide="right"
                        color="text"
                        onClick={() => setOpen((isOpen) => !isOpen)}
                      >
                        {labelFor(String(field.value))}
                      </EuiButton>
                    }
                  >
                    <EuiSelectable
                      singleSelection="always"
                      listProps={{
                        onFocusBadge: false,
                        style: {
                          minWidth: 130,
                        },
                      }}
                      options={timeUnits.map((item) => ({
                        key: item.value,
                        label: item.text,
                        checked: field.value === item.value ? 'on' : undefined,
                        'data-test-subj': `retentionPeriodUnit-${item.value}`,
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
          ),
        },
      }}
    />
  );
};
