/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiText,
  EuiTextArea,
  EuiIcon,
  EuiSuperSelect,
  EuiLink,
} from '@elastic/eui';
import useAsync from 'react-use/lib/useAsync';
import React, { useCallback, useMemo } from 'react';
import type { IndexEntry } from '@kbn/elastic-assistant-common';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { HttpSetup } from '@kbn/core-http-browser';
import { useIndexMappings } from './use_index_mappings';
import * as i18n from './translations';
import { isGlobalEntry } from './helpers';

interface Props {
  http: HttpSetup;
  dataViews: DataViewsContract;
  entry?: IndexEntry;
  originalEntry?: IndexEntry;
  setEntry: React.Dispatch<React.SetStateAction<Partial<IndexEntry>>>;
  hasManageGlobalKnowledgeBase: boolean;
  docLink: string;
}

export const IndexEntryEditor: React.FC<Props> = React.memo<Props>(
  ({ http, dataViews, entry, setEntry, hasManageGlobalKnowledgeBase, originalEntry, docLink }) => {
    const privateUsers = useMemo(() => {
      const originalUsers = originalEntry?.users;
      if (originalEntry && !isGlobalEntry(originalEntry)) {
        return originalUsers;
      }
      return undefined;
    }, [originalEntry]);

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
          users: value === i18n.SHARING_GLOBAL_OPTION_LABEL ? [] : privateUsers,
          global: value === i18n.SHARING_GLOBAL_OPTION_LABEL ? true : false,
        })),
      [privateUsers, setEntry]
    );
    const sharingOptions = [
      {
        'data-test-subj': 'sharing-private-option',
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
        'data-test-subj': 'sharing-global-option',
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
        disabled: !hasManageGlobalKnowledgeBase,
      },
    ];

    const selectedSharingOption =
      entry?.users?.length === 0 ? sharingOptions[1].value : sharingOptions[0].value;

    // Index
    const indicesAsync = useAsync(async () => {
      const result = await dataViews.getIndices({
        isRollupIndex: () => false,
        // exclude system indices
        pattern: '*,-.*',
      });
      return result ?? [];
    }, [dataViews]);

    const indexOptions = useMemo(
      () =>
        indicesAsync.value?.map((idx) => ({
          'data-test-subj': idx.name,
          label: idx.name,
          value: idx.name,
        })) ?? [],
      [indicesAsync.value]
    );

    const { value: isMissingIndex } = useAsync(async () => {
      if (!entry?.index?.length) return false;

      return !(await dataViews.getExistingIndices([entry.index])).length;
    }, [entry?.index]);

    const { data: mappingData } = useIndexMappings({
      http,
      indexName: entry?.index ?? '',
    });

    const fieldOptions = useMemo(
      () =>
        Object.entries(mappingData?.mappings?.properties ?? {})
          .filter(([, m]) => m.type === 'text' || m.type === 'semantic_text')
          .map(([name, details]) => ({
            'data-test-subj': `field-option-${name}`,
            label: name,
            value: name,
            append: <EuiBadge color={'hollow'}>{details.type}</EuiBadge>,
          })),
      [mappingData]
    );

    const outputFieldOptions = useMemo(
      () =>
        Object.entries(mappingData?.mappings?.properties ?? {}).map(([name, details]) => ({
          'data-test-subj': `output-field-option-${name}`,
          label: name,
          value: name,
          append: <EuiBadge color={'hollow'}>{details.type}</EuiBadge>,
        })),
      [mappingData]
    );

    const onCreateIndexOption = (searchValue: string) => {
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

    const onCreateFieldOption = (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();

      if (!normalizedSearchValue) {
        return;
      }

      const newOption: EuiComboBoxOptionOption<string> = {
        label: searchValue,
        value: searchValue,
      };

      setField([newOption]);
    };

    // Field
    const setField = useCallback(
      async (e: Array<EuiComboBoxOptionOption<string>>) =>
        setEntry((prevEntry) => ({ ...prevEntry, field: e[0]?.value })),
      [setEntry]
    );

    // Description
    const setDescription = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setEntry((prevEntry) => ({ ...prevEntry, description: e.target.value })),
      [setEntry]
    );

    // Query Description
    const setQueryDescription = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setEntry((prevEntry) => ({ ...prevEntry, queryDescription: e.target.value })),
      [setEntry]
    );

    // Field
    const setOutputFields = useCallback(
      async (e: Array<EuiComboBoxOptionOption<string>>) => {
        setEntry((prevEntry) => ({
          ...prevEntry,
          outputFields: e
            ?.filter((option) => !!option.value)
            .map((option) => option.value as string),
        }));
      },
      [setEntry]
    );

    const setIndex = useCallback(
      async (e: Array<EuiComboBoxOptionOption<string>>) => {
        setEntry((prevEntry) => ({ ...prevEntry, index: e[0]?.value }));
        setField([]);
        setOutputFields([]);
      },
      [setEntry, setField, setOutputFields]
    );

    const onCreateOutputFieldsOption = useCallback(
      (searchValue: string) => {
        const normalizedSearchValue = searchValue.trim().toLowerCase();

        if (!normalizedSearchValue) {
          return;
        }

        const newOption: EuiComboBoxOptionOption<string> = {
          label: searchValue,
          value: searchValue,
        };

        setOutputFields([
          ...(entry?.outputFields?.map((field) => ({
            label: field,
            value: field,
          })) ?? []),
          newOption,
        ]);
      },
      [entry?.outputFields, setOutputFields]
    );

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.ENTRY_NAME_INPUT_LABEL}
          helpText={i18n.ENTRY_NAME_INPUT_PLACEHOLDER}
          fullWidth
        >
          <EuiFieldText
            data-test-subj="entry-name"
            name="name"
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
            data-test-subj="sharing-select"
            options={sharingOptions}
            valueOfSelected={selectedSharingOption}
            onChange={setSharingOptions}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.ENTRY_INDEX_NAME_INPUT_LABEL}
          fullWidth
          isInvalid={isMissingIndex}
          error={isMissingIndex && <>{i18n.MISSING_INDEX_ERROR}</>}
          helpText={
            <FormattedMessage
              id={i18n.ENTRY_INDEX_NAME_INPUT_DESCRIPTION.id}
              defaultMessage={i18n.ENTRY_INDEX_NAME_INPUT_DESCRIPTION.defaultMessage}
              values={{
                docLink: (
                  <EuiLink
                    href={docLink}
                    target="_blank"
                    data-test-subj="knowledgeBaseIndexEntryDocLink"
                  >
                    {i18n.KNOWLEDGE_BASE_DOCUMENTATION_LINK}
                  </EuiLink>
                ),
              }}
            />
          }
        >
          <EuiComboBox
            data-test-subj="index-combobox"
            aria-label={i18n.ENTRY_INDEX_NAME_INPUT_LABEL}
            isClearable={true}
            isInvalid={isMissingIndex}
            singleSelection={{ asPlainText: true }}
            onCreateOption={onCreateIndexOption}
            fullWidth
            options={indexOptions ?? []}
            selectedOptions={
              entry?.index
                ? [
                    {
                      label: entry.index,
                      value: entry.index,
                    },
                  ]
                : []
            }
            onChange={setIndex}
          />
        </EuiFormRow>
        <EuiFormRow label={i18n.ENTRY_FIELD_INPUT_LABEL} fullWidth>
          <EuiComboBox
            aria-label={i18n.ENTRY_FIELD_PLACEHOLDER}
            data-test-subj="entry-combobox"
            isClearable={true}
            singleSelection={{ asPlainText: true }}
            onCreateOption={onCreateFieldOption}
            fullWidth
            options={fieldOptions}
            selectedOptions={
              entry?.field
                ? [
                    {
                      label: entry.field,
                      value: entry.field,
                    },
                  ]
                : []
            }
            onChange={setField}
            isDisabled={!entry?.index}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.ENTRY_DESCRIPTION_INPUT_LABEL}
          helpText={i18n.ENTRY_DESCRIPTION_HELP_LABEL}
          fullWidth
        >
          <EuiTextArea
            name="description"
            fullWidth
            placeholder={i18n.ENTRY_DESCRIPTION_PLACEHOLDER}
            data-test-subj="entry-description"
            value={entry?.description}
            onChange={setDescription}
            rows={2}
          />
        </EuiFormRow>
        <EuiFormRow
          label={i18n.ENTRY_QUERY_DESCRIPTION_INPUT_LABEL}
          helpText={i18n.ENTRY_QUERY_DESCRIPTION_HELP_LABEL}
          fullWidth
        >
          <EuiTextArea
            name="query_description"
            placeholder={i18n.ENTRY_QUERY_DESCRIPTION_PLACEHOLDER}
            data-test-subj="query-description"
            value={entry?.queryDescription}
            onChange={setQueryDescription}
            fullWidth
            rows={3}
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
            onCreateOption={onCreateOutputFieldsOption}
            fullWidth
            options={outputFieldOptions}
            isDisabled={!entry?.index?.length}
            selectedOptions={
              entry?.outputFields?.map((field) => ({
                label: field,
                value: field,
              })) ?? []
            }
            onChange={setOutputFields}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);
IndexEntryEditor.displayName = 'IndexEntryEditor';
