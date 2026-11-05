/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CategoryFieldSelectProps {
  fields: EuiComboBoxOptionOption[];
  selectedField: string | undefined;
  isDisabled: boolean;
  onChange: (options: EuiComboBoxOptionOption[]) => void;
}

/** Category field picker that exposes leftover, unselected input as an announced form error. */
export const CategoryFieldSelect: FC<CategoryFieldSelectProps> = ({
  fields,
  selectedField,
  isDisabled,
  onChange,
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [isInvalid, setIsInvalid] = useState(false);

  const onSearchChange = (value: string) => {
    setSearchValue(value);
    if (value === '') {
      setIsInvalid(false);
    }
  };

  const onFieldChange = (options: EuiComboBoxOptionOption[]) => {
    setIsInvalid(false);
    onChange(options);
  };

  // Mirrors EuiComboBox, which only flags leftover search text once the input loses focus.
  const onBlur = () => {
    setIsInvalid(searchValue !== '');
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.aiops.logCategorization.categoryFieldSelect', {
        defaultMessage: 'Category field',
      })}
      isInvalid={isInvalid}
      error={
        isInvalid
          ? i18n.translate('xpack.aiops.logCategorization.categoryFieldSelectInvalidError', {
              defaultMessage:
                '{value} is not a valid category field. Select a field from the list.',
              values: { value: searchValue },
            })
          : undefined
      }
    >
      <EuiComboBox
        compressed
        isDisabled={isDisabled}
        isInvalid={isInvalid}
        options={fields}
        onChange={onFieldChange}
        onSearchChange={onSearchChange}
        onBlur={onBlur}
        selectedOptions={selectedField === undefined ? undefined : [{ label: selectedField }]}
        singleSelection={{ asPlainText: true }}
        data-test-subj="aiopsLogPatternAnalysisCategoryField"
      />
    </EuiFormRow>
  );
};
