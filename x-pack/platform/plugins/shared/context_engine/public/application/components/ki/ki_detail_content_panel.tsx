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
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
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

const panelFillStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  flex: '1 1 auto',
  minHeight: 0,
};

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
    <div style={panelFillStyle} data-test-subj="contextKiDetailContentPanel">
      {isEditing ? (
        <>
          <EuiPanel hasBorder paddingSize="l" style={panelFillStyle}>
            <EuiFormRow
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
          </EuiPanel>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
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
        <EuiPanel
          hasBorder
          paddingSize="l"
          style={{
            ...panelFillStyle,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <EuiText size="s" color="subdued" data-test-subj="contextKiDetailContentEmpty">
            <FormattedMessage
              id="xpack.contextEngine.kiDetail.content.empty"
              defaultMessage="No content"
            />
          </EuiText>
        </EuiPanel>
      )}
    </div>
  );
};
