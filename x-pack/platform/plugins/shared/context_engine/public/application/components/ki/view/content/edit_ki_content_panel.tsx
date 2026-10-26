/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiSpacer,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MAX_KI_CONTENT_LENGTH } from '../../../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../../common/telemetry';
import { validateTextInput } from '../../../../utils/validate_text_input';

export interface EditKiContentPanelSaveFields {
  content: string;
}

interface EditKiContentPanelProps {
  content: string;
  isSaving?: boolean;
  onCancel?: () => void;
  onSave?: (fields: EditKiContentPanelSaveFields) => void;
}

export const EditKiContentPanel = ({
  content,
  isSaving = false,
  onCancel,
  onSave,
}: EditKiContentPanelProps) => {
  const [contentDraft, setContentDraft] = useState(content);

  const contentValidation = validateTextInput({
    value: contentDraft,
    maxLength: MAX_KI_CONTENT_LENGTH,
  });

  const hasUnsavedChanges = contentDraft !== content;

  const cancelEditing = () => {
    setContentDraft(content);
    onCancel?.();
  };

  const saveDraft = () => {
    if (!contentValidation.valid || !hasUnsavedChanges || !onSave) {
      return;
    }
    onSave({ content: contentDraft });
  };

  const markdownEditorLabel = i18n.translate('xpack.contextEngine.viewKi.content.editorLabel', {
    defaultMessage: 'Content markdown editor',
  });

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      data-test-subj="contextViewKiContentPanel"
    >
      <EuiFormRow
        data-test-subj="contextViewKiContentEditing"
        isInvalid={Boolean(contentValidation.error)}
        error={contentValidation.error}
        helpText={contentValidation.warning}
        fullWidth
      >
        <EuiMarkdownEditor
          value={contentDraft}
          onChange={setContentDraft}
          height={400}
          aria-label={markdownEditorLabel}
          data-test-subj="contextViewKiContentField"
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            onClick={cancelEditing}
            isDisabled={isSaving}
            data-test-subj="contextViewKiCancelButton"
            {...getEbtProps({
              element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
              action: CONTEXT_ENGINE_UI_EBT.action.editKi.CANCEL,
            })}
          >
            <FormattedMessage
              id="xpack.contextEngine.viewKi.content.cancelButton"
              defaultMessage="Cancel"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            size="s"
            onClick={saveDraft}
            disabled={!contentValidation.valid || !hasUnsavedChanges}
            isLoading={isSaving}
            data-test-subj="contextViewKiSaveButton"
            {...getEbtProps({
              element: CONTEXT_ENGINE_UI_EBT.element.viewKiPage,
              action: CONTEXT_ENGINE_UI_EBT.action.editKi.SAVE,
            })}
          >
            <FormattedMessage
              id="xpack.contextEngine.viewKi.content.saveButton"
              defaultMessage="Save"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
