/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useState, useEffect } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface CategoryFieldSelectorProps {
  fields: EuiComboBoxOptionOption[];
  selectedField: string | undefined;
  isDisabled: boolean;
  onChange: (options: EuiComboBoxOptionOption[]) => void;
}

/** Category field picker that exposes leftover, unselected input as an announced form error. */
export const CategoryFieldSelector: FC<CategoryFieldSelectorProps> = React.memo(
  ({ fields, selectedField, isDisabled, onChange }) => {
    const [searchValue, setSearchValue] = useState('');
    const [isInvalid, setIsInvalid] = useState(false);

    // Clear the invalid flag whenever the leftover text is gone or a field is selected.
    // EuiComboBox resets the search to '' after a selection, so both paths end up here;
    // the flag is only raised on blur, mirroring when EuiComboBox shows its own red state.
    useEffect(() => {
      if (searchValue === '' || selectedField !== undefined) {
        setIsInvalid(false);
      }
    }, [searchValue, selectedField]);

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
        error={i18n.translate('xpack.aiops.logCategorization.categoryFieldSelectInvalidError', {
          defaultMessage: '{value} is not a valid category field. Select a field from the list.',
          values: { value: searchValue },
        })}
      >
        <EuiComboBox
          compressed
          isDisabled={isDisabled}
          isInvalid={isInvalid}
          options={fields}
          onChange={onChange}
          onSearchChange={setSearchValue}
          onBlur={onBlur}
          selectedOptions={selectedField === undefined ? undefined : [{ label: selectedField }]}
          singleSelection={{ asPlainText: true }}
          data-test-subj="aiopsLogPatternAnalysisCategoryField"
        />
      </EuiFormRow>
    );
  }
);
