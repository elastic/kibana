/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { IndexEntry } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';

interface Props {
  entry?: IndexEntry;
  setEntry: React.Dispatch<React.SetStateAction<Partial<IndexEntry>>>;
}

export const IndexEntryEditor: React.FC<Props> = React.memo(({ entry, setEntry }) => {
  // Name
  const setName = useCallback(
    (e) => setEntry((prevEntry) => ({ ...prevEntry, name: e.target.value })),
    [setEntry]
  );
  // Index
  const setIndex = useCallback(
    (e: Array<EuiComboBoxOptionOption<string>>) =>
      setEntry((prevEntry) => ({ ...prevEntry, index: e[0].value })),
    [setEntry]
  );

  const onCreateOption = (searchValue: string) => {
    const normalizedSearchValue = searchValue.trim().toLowerCase();

    if (!normalizedSearchValue) {
      return;
    }

    const newOption: EuiComboBoxOptionOption<string> = {
      label: searchValue,
      value: searchValue,
    };

    // Select the option.
    setIndex([newOption]);
  };
  // Field
  const setField = useCallback(
    (e) => setEntry((prevEntry) => ({ ...prevEntry, field: e.target.value })),
    [setEntry]
  );
  // Description
  const setDescription = useCallback(
    (e) => setEntry((prevEntry) => ({ ...prevEntry, description: e.target.value })),
    [setEntry]
  );
  // Query Description
  const setQueryDescription = useCallback(
    (e) => setEntry((prevEntry) => ({ ...prevEntry, queryDescription: e.target.value })),
    [setEntry]
  );

  return (
    <EuiForm>
      <EuiFormRow label={i18n.ENTRY_NAME_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="name"
          placeholder={i18n.ENTRY_NAME_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.name}
          onChange={setName}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_INDEX_NAME_INPUT_LABEL} fullWidth>
        <EuiComboBox
          aria-label={i18n.ENTRY_INDEX_NAME_INPUT_LABEL}
          isClearable={true}
          singleSelection={{ asPlainText: true }}
          onCreateOption={onCreateOption}
          fullWidth
          selectedOptions={
            entry?.index
              ? [
                  {
                    label: entry?.index,
                    value: entry?.index,
                  },
                ]
              : []
          }
          onChange={setIndex}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_FIELD_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="field"
          placeholder={i18n.ENTRY_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.field}
          onChange={setField}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_DESCRIPTION_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="description"
          placeholder={i18n.ENTRY_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.description}
          onChange={setDescription}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_QUERY_DESCRIPTION_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="description"
          placeholder={i18n.ENTRY_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.queryDescription}
          onChange={setQueryDescription}
        />
      </EuiFormRow>
    </EuiForm>
  );
});
IndexEntryEditor.displayName = 'IndexEntryEditor';
