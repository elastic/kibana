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
import { KnowledgeBaseEntryResponse } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import * as i18n from './translations';

interface Props {
  entry?: KnowledgeBaseEntryResponse;
}

export const EntryEditor: React.FC<Props> = React.memo(({ entry }) => {
  const [markdownValue, setMarkdownValue] = React.useState('');
  const accessOptions = useMemo(
    () => [
      { id: 'user', label: i18n.ENTRY_ACCESS_USER_BUTTON_LABEL },
      { id: 'global', label: i18n.ENTRY_ACCESS_GLOBAL_BUTTON_LABEL },
    ],
    []
  );
  const [toggleCompressedIdSelected, setToggleCompressedIdSelected] = useState(accessOptions[0].id);

  const onAccessChanged = useCallback((optionId: string) => {
    setToggleCompressedIdSelected(optionId);
  }, []);

  const onRequiredKnowledgeChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {},
  []);
  return (
    <EuiForm>
      <EuiFormRow label={i18n.ENTRY_NAME_INPUT_LABEL} fullWidth>
        <EuiFieldText name="name" placeholder={i18n.ENTRY_NAME_INPUT_PLACEHOLDER} fullWidth />
      </EuiFormRow>
      <EuiFormRow label={i18n.ENTRY_SPACE_INPUT_LABEL} fullWidth>
        <EuiComboBox
          aria-label={i18n.ENTRY_SPACE_INPUT_LABEL}
          placeholder={i18n.ENTRY_SPACE_INPUT_PLACEHOLDER}
          isClearable={true}
          isCaseSensitive
          fullWidth
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
        />
      </EuiFormRow>
    </EuiForm>
  );
});

EntryEditor.displayName = 'EntryEditor';
