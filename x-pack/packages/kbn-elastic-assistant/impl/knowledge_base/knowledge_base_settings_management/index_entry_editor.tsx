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
  EuiText,
  EuiIcon,
  EuiSuperSelect,
} from '@elastic/eui';
import React, { useCallback } from 'react';
import { IndexEntry } from '@kbn/elastic-assistant-common';
import { DataViewsContract } from '@kbn/data-views-plugin/public';
import * as i18n from './translations';

interface Props {
  dataViews: DataViewsContract;
  entry?: IndexEntry;
  setEntry: React.Dispatch<React.SetStateAction<Partial<IndexEntry>>>;
}

export const IndexEntryEditor: React.FC<Props> = React.memo(({ dataViews, entry, setEntry }) => {
  // Name
  const setName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEntry((prevEntry) => ({ ...prevEntry, name: e.target.value })),
    [setEntry]
  );

  // Sharing
  const setSharingOptions = useCallback(
    (value: string) =>
      setEntry((prevEntry) => ({
        ...prevEntry,
        users: value === i18n.SHARING_GLOBAL_OPTION_LABEL ? [] : undefined,
      })),
    [setEntry]
  );
  // TODO: KB-RBAC Disable global option if no RBAC
  const sharingOptions = [
    {
      value: i18n.SHARING_PRIVATE_OPTION_LABEL,
      inputDisplay: (
        <EuiText size={'s'}>
          <EuiIcon
            color="subdued"
            style={{ lineHeight: 'inherit', marginRight: '4px' }}
            type="lock"
          />
          {i18n.SHARING_PRIVATE_OPTION_LABEL}
        </EuiText>
      ),
    },
    {
      value: i18n.SHARING_GLOBAL_OPTION_LABEL,
      inputDisplay: (
        <EuiText size={'s'}>
          <EuiIcon
            color="subdued"
            style={{ lineHeight: 'inherit', marginRight: '4px' }}
            type="globe"
          />
          {i18n.SHARING_GLOBAL_OPTION_LABEL}
        </EuiText>
      ),
    },
  ];
  const selectedSharingOption =
    entry?.users?.length === 0 ? sharingOptions[1].value : sharingOptions[0].value;

  // Index
  // TODO: For index field autocomplete
  // const indexOptions = useMemo(() => {
  //   const indices = await dataViews.getIndices({
  //     pattern: e[0]?.value ?? '',
  //     isRollupIndex: () => false,
  //   });
  // }, [dataViews]);
  const setIndex = useCallback(
    async (e: Array<EuiComboBoxOptionOption<string>>) => {
      setEntry((prevEntry) => ({ ...prevEntry, index: e[0]?.value }));
    },
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

    setIndex([newOption]);
  };

  // Field
  const setField = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEntry((prevEntry) => ({ ...prevEntry, field: e.target.value })),
    [setEntry]
  );

  // Description
  const setDescription = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEntry((prevEntry) => ({ ...prevEntry, description: e.target.value })),
    [setEntry]
  );

  // Query Description
  const setQueryDescription = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setEntry((prevEntry) => ({ ...prevEntry, queryDescription: e.target.value })),
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
      <EuiFormRow
        label={i18n.ENTRY_SHARING_INPUT_LABEL}
        helpText={i18n.SHARING_HELP_TEXT}
        fullWidth
      >
        <EuiSuperSelect
          options={sharingOptions}
          valueOfSelected={selectedSharingOption}
          onChange={setSharingOptions}
          fullWidth
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
          placeholder={i18n.ENTRY_FIELD_PLACEHOLDER}
          fullWidth
          value={entry?.field}
          onChange={setField}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.ENTRY_DESCRIPTION_INPUT_LABEL}
        helpText={i18n.ENTRY_DESCRIPTION_HELP_LABEL}
        fullWidth
      >
        <EuiFieldText
          name="description"
          fullWidth
          value={entry?.description}
          onChange={setDescription}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.ENTRY_QUERY_DESCRIPTION_INPUT_LABEL}
        helpText={i18n.ENTRY_QUERY_DESCRIPTION_HELP_LABEL}
        fullWidth
      >
        <EuiFieldText
          name="description"
          fullWidth
          value={entry?.queryDescription}
          onChange={setQueryDescription}
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.ENTRY_OUTPUT_FIELDS_INPUT_LABEL}
        helpText={i18n.ENTRY_OUTPUT_FIELDS_HELP_LABEL}
        fullWidth
      >
        <EuiComboBox
          aria-label={i18n.ENTRY_OUTPUT_FIELDS_INPUT_LABEL}
          isClearable={true}
          singleSelection={{ asPlainText: true }}
          onCreateOption={onCreateOption}
          fullWidth
          selectedOptions={[]}
          onChange={setIndex}
        />
      </EuiFormRow>
    </EuiForm>
  );
});
IndexEntryEditor.displayName = 'IndexEntryEditor';
