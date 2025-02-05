/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionsListProps, EuiComboBoxProps } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo, useState } from 'react';
import { isDefined } from '@kbn/ml-is-defined';
import { i18n } from '@kbn/i18n';
import { ALL_TRANSFORMS_SELECTION } from '../../../common/constants';

export interface TransformSelectorControlProps {
  label?: string | JSX.Element;
  errors?: string[];
  onChange: (transformSelection: string[]) => void;
  selectedOptions: string[];
  options: string[];
  allowSelectAll?: boolean;
}

function convertToEuiOptions(values: string[]) {
  return values.map((v) => ({ value: v, label: v }));
}

export const TransformSelectorControl: FC<TransformSelectorControlProps> = ({
  label,
  errors,
  onChange,
  selectedOptions,
  options,
  allowSelectAll = false,
}) => {
  const [allowCustomOptions, setAllowCustomOptions] = useState(false);

  const onSelectionChange: EuiComboBoxProps<string>['onChange'] = ((selectionUpdate) => {
    if (!selectionUpdate?.length) {
      onChange([]);
      return;
    }
    if (selectionUpdate[selectionUpdate.length - 1].value === ALL_TRANSFORMS_SELECTION) {
      onChange([ALL_TRANSFORMS_SELECTION]);
      return;
    }
    onChange(
      selectionUpdate
        .slice(selectionUpdate[0].value === ALL_TRANSFORMS_SELECTION ? 1 : 0)
        .map((v) => v.value)
        .filter(isDefined)
    );
  }) as Exclude<EuiComboBoxProps<string>['onChange'], undefined>;

  const onCreateOption = allowCustomOptions
    ? (((searchValue) => {
        onChange([...selectedOptions, searchValue]);
      }) as EuiComboBoxOptionsListProps<string>['onCreateOption'])
    : undefined;

  const selectedOptionsEui = useMemo(() => convertToEuiOptions(selectedOptions), [selectedOptions]);
  const optionsEui = useMemo(() => {
    return convertToEuiOptions(allowSelectAll ? [ALL_TRANSFORMS_SELECTION, ...options] : options);
  }, [options, allowSelectAll]);

  return (
    <EuiFormRow fullWidth label={label} isInvalid={!!errors?.length} error={errors}>
      <EuiComboBox<string>
        onSearchChange={(searchValue, hasMatchingOption) => {
          setAllowCustomOptions(!hasMatchingOption && searchValue.includes('*'));
        }}
        onCreateOption={onCreateOption}
        customOptionText={i18n.translate(
          'xpack.transform.alertTypes.transformHealth.customOptionText',
          {
            defaultMessage: 'Include {searchValuePlaceholder} wildcard',
            values: { searchValuePlaceholder: '{searchValue}' },
          }
        )}
        singleSelection={false}
        selectedOptions={selectedOptionsEui}
        options={optionsEui}
        onChange={onSelectionChange}
        fullWidth
        data-test-subj={'transformSelection'}
        isInvalid={!!errors?.length}
      />
    </EuiFormRow>
  );
};
