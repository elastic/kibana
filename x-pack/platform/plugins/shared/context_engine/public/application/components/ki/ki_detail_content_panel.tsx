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
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { KiDocument } from '../../../../common/http_api/knowledge_indicators';
import { MAX_KI_CONTENT_LENGTH } from '../../../../common/step_types/ki';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { getTextInputHardMaxLength, validateTextInput } from '../../utils/validate_text_input';
import { getDocumentString } from './ki_detail_helpers';

const preWrapStyle = css`
  white-space: pre-wrap;
`;

export interface KiDetailContentPanelSaveFields {
  content: string;
}

interface KiDetailContentPanelProps {
  document: KiDocument;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (fields: KiDetailContentPanelSaveFields) => void;
}

export const KiDetailContentPanel = ({
  document,
  canEdit,
  isSaving,
  onSave,
}: KiDetailContentPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [contentDraft, setContentDraft] = useState('');
  const contentValue = getDocumentString(document, 'content');

  const contentValidation = validateTextInput({
    value: contentDraft,
    maxLength: MAX_KI_CONTENT_LENGTH,
  });

  const startEditing = () => {
    setContentDraft(contentValue);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setContentDraft(contentValue);
    setIsEditing(false);
  };

  const saveDraft = () => {
    if (!contentValidation.valid) {
      return;
    }
    onSave({ content: contentDraft });
    setIsEditing(false);
  };

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextKiDetailContentPanel">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.kiDetail.content.title"
                defaultMessage="Content"
              />
            </h2>
          </EuiTitle>
        </EuiFlexItem>
        {!isEditing && canEdit && (
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="pencil"
              onClick={startEditing}
              data-test-subj="contextKiDetailEditButton"
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.kiDetailPage,
                action: CONTEXT_ENGINE_UI_EBT.action.kiDetail.EDIT,
              })}
            >
              <FormattedMessage
                id="xpack.contextEngine.kiDetail.editButton"
                defaultMessage="Edit"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isEditing ? (
        <>
          <EuiForm fullWidth component="div">
            <EuiFormRow
              label={
                <FormattedMessage
                  id="xpack.contextEngine.kiDetail.content.contentLabel"
                  defaultMessage="Content"
                />
              }
              isInvalid={Boolean(contentValidation.error)}
              error={contentValidation.error}
              helpText={contentValidation.warning}
            >
              <EuiTextArea
                isInvalid={Boolean(contentValidation.error)}
                value={contentDraft}
                onChange={(event) => setContentDraft(event.target.value)}
                rows={8}
                maxLength={getTextInputHardMaxLength(MAX_KI_CONTENT_LENGTH)}
                data-test-subj="contextKiDetailContentField"
              />
            </EuiFormRow>
          </EuiForm>
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
                disabled={!contentValidation.valid}
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
      ) : contentValue.length > 0 ? (
        <EuiText size="s" data-test-subj="contextKiDetailContent">
          <p css={preWrapStyle}>{contentValue}</p>
        </EuiText>
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="contextKiDetailContentEmpty">
          <FormattedMessage
            id="xpack.contextEngine.kiDetail.content.empty"
            defaultMessage="No content"
          />
        </EuiText>
      )}
    </EuiPanel>
  );
};
