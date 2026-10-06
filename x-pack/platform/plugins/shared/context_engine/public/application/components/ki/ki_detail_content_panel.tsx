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
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { MAX_KI_CONTENT_LENGTH } from '../../../../common/step_types/ki';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { validateTextInput } from '../../utils/validate_text_input';
import { getDocumentString } from './ki_detail_helpers';
import { KiDetailMarkdownReadOnly } from './ki_detail_markdown_read_only';
import { useKiDetailContentPanelStyles } from './use_ki_detail_content_panel_styles';
const editingActionsStyle = css`
  flex-shrink: 0;
`;

export interface KiDetailContentPanelSaveFields {
  content: string;
}

interface KiDetailContentPanelProps {
  document: KiDocument;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  isSaving: boolean;
  onSave: (fields: KiDetailContentPanelSaveFields) => void;
}

export const KiDetailContentPanel = ({
  document,
  isEditing,
  onEditingChange,
  isSaving,
  onSave,
}: KiDetailContentPanelProps) => {
  const panelStyles = useKiDetailContentPanelStyles();
  const contentValue = getDocumentString(document, 'content');
  const [contentDraft, setContentDraft] = useState(contentValue);

  const contentValidation = validateTextInput({
    value: contentDraft,
    maxLength: MAX_KI_CONTENT_LENGTH,
  });

  const hasUnsavedChanges = contentDraft !== contentValue;

  useEffect(() => {
    if (isEditing) {
      setContentDraft(contentValue);
    }
  }, [contentValue, isEditing]);

  const cancelEditing = () => {
    setContentDraft(contentValue);
    onEditingChange(false);
  };

  const saveDraft = () => {
    if (!contentValidation.valid || !hasUnsavedChanges) {
      return;
    }
    onSave({ content: contentDraft });
    onEditingChange(false);
  };

  const markdownEditorLabel = i18n.translate('xpack.contextEngine.kiDetail.content.editorLabel', {
    defaultMessage: 'Content markdown editor',
  });

  const hasContent = contentValue.length > 0;

  return (
    <div css={panelStyles.panelRoot} data-test-subj="contextKiDetailContentPanel">
      {isEditing ? (
        <>
          <div css={[panelStyles.shell, panelStyles.shellFill]}>
            <div css={panelStyles.body}>
              <EuiFormRow
                css={panelStyles.editingFormRow}
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
                  data-test-subj="contextKiDetailContentField"
                />
              </EuiFormRow>
            </div>
          </div>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            justifyContent="flexEnd"
            gutterSize="s"
            responsive={false}
            css={editingActionsStyle}
          >
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={cancelEditing}
                data-test-subj="contextKiDetailCancelButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.kiDetailPage,
                  action: CONTEXT_ENGINE_UI_EBT.action.kiDetail.CANCEL,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.kiDetail.cancelButton"
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
                data-test-subj="contextKiDetailSaveButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.kiDetailPage,
                  action: CONTEXT_ENGINE_UI_EBT.action.kiDetail.SAVE,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.kiDetail.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : hasContent ? (
        <KiDetailMarkdownReadOnly content={contentValue} />
      ) : (
        <div css={[panelStyles.shell, panelStyles.shellFill, panelStyles.emptyShell]}>
          <EuiText size="s" color="subdued" data-test-subj="contextKiDetailContentEmpty">
            <FormattedMessage
              id="xpack.contextEngine.kiDetail.content.empty"
              defaultMessage="No content"
            />
          </EuiText>
        </div>
      )}
    </div>
  );
};
