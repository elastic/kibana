/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiCheckbox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSuperSelect,
  EuiIcon,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { DocumentEntry } from '@kbn/elastic-assistant-common';
import * as i18n from './translations';
import { isGlobalEntry } from './helpers';

interface Props {
  entry?: DocumentEntry;
  originalEntry?: DocumentEntry;
  setEntry: React.Dispatch<React.SetStateAction<Partial<DocumentEntry>>>;
  hasManageGlobalKnowledgeBase: boolean;
}

export const DocumentEntryEditor: React.FC<Props> = React.memo(
  ({ entry, setEntry, hasManageGlobalKnowledgeBase, originalEntry }) => {
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

    // Text / markdown
    const setMarkdownValue = useCallback(
      (value: string) => {
        setEntry((prevEntry) => ({ ...prevEntry, text: value }));
      },
      [setEntry]
    );

    // Required checkbox
    const onRequiredKnowledgeChanged = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setEntry((prevEntry) => ({ ...prevEntry, required: e.target.checked }));
      },
      [setEntry]
    );

    return (
      <EuiForm>
        <EuiFormRow
          label={i18n.ENTRY_NAME_INPUT_LABEL}
          helpText={i18n.ENTRY_NAME_INPUT_PLACEHOLDER}
          fullWidth
        >
          <EuiFieldText
            name="name"
            data-test-subj="entryNameInput"
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
        <EuiFormRow label={i18n.ENTRY_MARKDOWN_INPUT_TEXT} fullWidth>
          <EuiMarkdownEditor
            aria-label={i18n.ENTRY_MARKDOWN_INPUT_TEXT}
            data-test-subj="entryMarkdownInput"
            placeholder="# Title"
            value={entry?.text ?? ''}
            onChange={setMarkdownValue}
            height={400}
            initialViewMode={'editing'}
          />
        </EuiFormRow>
        <EuiFormRow fullWidth helpText={i18n.ENTRY_REQUIRED_KNOWLEDGE_HELP_TEXT}>
          <EuiCheckbox
            label={i18n.ENTRY_REQUIRED_KNOWLEDGE_CHECKBOX_LABEL}
            id="requiredKnowledge"
            onChange={onRequiredKnowledgeChanged}
            checked={entry?.required ?? false}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

DocumentEntryEditor.displayName = 'DocumentEntryEditor';
