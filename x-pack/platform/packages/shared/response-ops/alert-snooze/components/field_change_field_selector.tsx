/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiComboBox, type EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataConditionEntry } from './types';
import * as i18n from './translations';

export interface FieldChangeFieldSelectorProps {
  entry: DataConditionEntry;
  onChange: (next: DataConditionEntry) => void;
  /** Leaf-level scalar alert fields offered as options. */
  options: Array<EuiComboBoxOptionOption<string>>;
  isLoading?: boolean;
}

/**
 * Searchable dropdown used by the `field_change` snooze condition. Options are
 * scoped to the alert document's leaf-level scalar fields (supplied by the
 * caller via the snooze component's `fieldOptions` prop), preventing users from
 * entering unsupported nested/array paths (see issue #275054). This component is
 * purely presentational — the package never fetches; consumers do.
 */
export const FieldChangeFieldSelector = ({
  entry,
  onChange,
  options,
  isLoading = false,
}: FieldChangeFieldSelectorProps) => {
  const selectedOptions: Array<EuiComboBoxOptionOption<string>> = entry.field
    ? [{ label: entry.field, value: entry.field }]
    : [];

  const handleChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onChange({ ...entry, field: selected[0]?.value ?? '' });
    },
    [entry, onChange]
  );

  return (
    <EuiComboBox
      compressed
      isClearable
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selectedOptions}
      isLoading={isLoading}
      onChange={handleChange}
      placeholder={i18n.SELECT_FIELD_PLACEHOLDER}
      aria-label={i18n.CONDITION_VALUE_ARIA_LABEL}
      data-test-subj={`dataConditionField-${entry.id}`}
    />
  );
};
