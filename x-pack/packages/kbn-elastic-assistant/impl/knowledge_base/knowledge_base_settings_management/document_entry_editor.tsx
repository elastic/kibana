/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiButtonGroup,
  EuiCheckbox,
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiMarkdownEditor,
} from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { DocumentEntry } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import { useAssistantContext } from '../../..';
import * as i18n from './translations';
import { useCreateKnowledgeBaseEntry } from '../../assistant/api/knowledge_base/entries/use_create_knowledge_base_entry';

interface Props {
  entry?: DocumentEntry;
}

export const DocumentEntryEditor: React.FC<Props> = React.memo(({ entry }) => {
  const { http, toasts } = useAssistantContext();
  const { mutate: createEntry, isLoading: isCreatingEntry } = useCreateKnowledgeBaseEntry({
    http,
    toasts,
  });

  const [markdownValue, setMarkdownValue] = React.useState(entry?.text ?? '');
  const accessOptions = useMemo(
    () => [
      { id: 'user', label: i18n.ENTRY_ACCESS_USER_BUTTON_LABEL },
      { id: 'global', label: i18n.ENTRY_ACCESS_GLOBAL_BUTTON_LABEL },
    ],
    []
  );
  const accessIndex = entry?.users?.length === 0 ? 1 : 0;
  const [toggleCompressedIdSelected, setToggleCompressedIdSelected] = useState(
    accessOptions[accessIndex].id
  );

  const onAccessChanged = useCallback((optionId: string) => {
    setToggleCompressedIdSelected(optionId);
  }, []);

  const onRequiredKnowledgeChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {},
  []);
  return (
    <EuiForm>
      <EuiFormRow label={i18n.ENTRY_NAME_INPUT_LABEL} fullWidth>
        <EuiFieldText
          name="name"
          placeholder={i18n.ENTRY_NAME_INPUT_PLACEHOLDER}
          fullWidth
          value={entry?.name}
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_SPACE_INPUT_LABEL} fullWidth>
        <EuiComboBox
          aria-label={i18n.ENTRY_SPACE_INPUT_LABEL}
          placeholder={i18n.ENTRY_SPACE_INPUT_PLACEHOLDER}
          isClearable={true}
          isCaseSensitive
          fullWidth
          selectedOptions={
            entry?.namespace
              ? [
                  {
                    label: entry?.namespace,
                    value: entry?.namespace,
                  },
                ]
              : []
          }
        />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_MARKDOWN_INPUT_TEXT} fullWidth>
        <EuiMarkdownEditor
          aria-label={i18n.ENTRY_MARKDOWN_INPUT_TEXT}
          placeholder="# Title"
          value={markdownValue}
          onChange={setMarkdownValue}
          height={400}
          initialViewMode="viewing"
        />
      </EuiFormRow>
      <EuiFormRow
        label={i18n.ENTRY_ACCESS_INPUT_LABEL}
        helpText={i18n.ENTRY_ACCESS_HELP_TEXT}
        css={css`
          width: 400px;
        `}
      >
        <EuiButtonGroup
          name={i18n.ENTRY_ACCESS_INPUT_LABEL}
          legend={i18n.ENTRY_ACCESS_INPUT_LABEL}
          options={accessOptions}
          idSelected={toggleCompressedIdSelected}
          onChange={(id) => onAccessChanged(id)}
          isFullWidth
          css={css`
            width: 300px;
          `}
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
});

DocumentEntryEditor.displayName = 'DocumentEntryEditor';
