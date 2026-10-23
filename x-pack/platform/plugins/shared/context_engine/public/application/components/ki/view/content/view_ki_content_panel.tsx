/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiMarkdownEditor,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import type { KiDocument } from '../../../../../../common/http_api/knowledge_indicators';
import { MAX_KI_CONTENT_LENGTH } from '../../../../../../common/step_types/ki';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../../common/telemetry';
import { validateTextInput } from '../../../../utils/validate_text_input';
import { viewKiLoadingPanelCss } from '../view_ki_constants';

export interface ViewKiContentPanelSaveFields {
  content: string;
}

interface ViewKiContentPanelProps {
  document?: KiDocument;
  isLoading?: boolean;
  isEditing?: boolean;
  onEditingChange?: (isEditing: boolean) => void;
  isSaving?: boolean;
  onSave?: (fields: ViewKiContentPanelSaveFields) => void;
}

export const ViewKiContentPanel = ({
  document,
  isLoading = false,
  isEditing = false,
  onEditingChange,
  isSaving = false,
  onSave,
}: ViewKiContentPanelProps) => {
  const contentValue = document?.content ?? '';
  const hasContent = contentValue.length > 0;
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

  if (isLoading) {
    return (
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        responsive={false}
        data-test-subj="contextViewKiContentPanel"
      >
        <EuiPanel
          hasBorder
          paddingSize="l"
          css={viewKiLoadingPanelCss}
          data-test-subj="contextViewKiContentLoading"
        >
          <EuiSkeletonText lines={3} />
        </EuiPanel>
      </EuiFlexGroup>
    );
  }

  const cancelEditing = () => {
    setContentDraft(contentValue);
    onEditingChange?.(false);
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

  if (isEditing) {
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
  }

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      responsive={false}
      justifyContent={hasContent ? 'flexStart' : 'center'}
      data-test-subj="contextViewKiContentPanel"
    >
      {hasContent ? (
        <EuiPanel hasBorder paddingSize="l" data-test-subj="contextViewKiContent">
          <div data-test-subj="contextViewKiMarkdownRendered">
            <EuiMarkdownFormat textSize="s">{contentValue}</EuiMarkdownFormat>
          </div>
        </EuiPanel>
      ) : (
        <EuiEmptyPrompt
          iconType="document"
          titleSize="xs"
          data-test-subj="contextViewKiContentEmpty"
          body={
            <p>
              <FormattedMessage
                id="xpack.contextEngine.viewKi.content.empty"
                defaultMessage="No content"
              />
            </p>
          }
        />
      )}
    </EuiFlexGroup>
  );
};
