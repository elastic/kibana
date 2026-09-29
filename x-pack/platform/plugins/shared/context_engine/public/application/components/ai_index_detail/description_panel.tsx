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
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { AiIndexDetailPanelDescription } from './ai_index_detail_panel_description';
import { AiIndexDetailPanelEmptyPrompt } from './ai_index_detail_panel_empty_prompt';
import { AiIndexDescriptionField } from '../ai_index_description_field';
import { useSaveAiIndexDescription } from '../../hooks/use_save_ai_index_description';
import { validateTextInput } from '../../utils/validate_text_input';

interface DescriptionPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
  isManaged: boolean;
}

export const DescriptionPanel = ({
  isLoading,
  aiIndex,
  onSaved,
  isManaged,
}: DescriptionPanelProps) => {
  const { saveDescription, isSaving } = useSaveAiIndexDescription();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const descriptionValidation = validateTextInput({
    value: draft,
    maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
  });
  const hasDescription = Boolean(aiIndex?.description);
  const isEditingActive = isEditing && !isSaving;

  const startEditing = () => {
    setDraft(aiIndex?.description ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!aiIndex || !descriptionValidation.valid) {
      return;
    }
    const saved = await saveDescription(aiIndex, draft);
    if (saved) {
      setIsEditing(false);
      onSaved();
    }
  };

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.description.title"
                defaultMessage="Description"
              />
            </h2>
          </EuiTitle>
          {!isLoading && !hasDescription && (
            <AiIndexDetailPanelDescription>
              {isManaged ? (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.descriptionEmptyManaged"
                  defaultMessage="No description is configured for this AI index."
                />
              ) : (
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.descriptionEmpty"
                  defaultMessage="Add a description to shape suggested automations and help agents decide when this AI index is relevant."
                />
              )}
            </AiIndexDetailPanelDescription>
          )}
        </EuiFlexItem>
        {!isEditingActive && !isManaged && !isLoading && (
          <EuiFlexItem grow={false}>
            {hasDescription ? (
              <EuiButtonEmpty
                size="s"
                iconType="pencil"
                onClick={startEditing}
                isLoading={isSaving}
                isDisabled={aiIndex === undefined}
                data-test-subj="contextEditDescriptionButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDescriptionPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.description.EDIT,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.editButton"
                  defaultMessage="Edit"
                />
              </EuiButtonEmpty>
            ) : (
              <EuiButtonEmpty
                size="s"
                iconType="plusCircle"
                onClick={startEditing}
                isLoading={isSaving}
                isDisabled={aiIndex === undefined}
                data-test-subj="contextAddDescriptionButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDescriptionPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.description.EDIT,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.addButton"
                  defaultMessage="Add description"
                />
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : isEditingActive ? (
        <>
          <AiIndexDescriptionField
            value={draft}
            onChange={setDraft}
            error={descriptionValidation.error}
            warning={descriptionValidation.warning}
            data-test-subj="contextDescriptionTextArea"
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => setIsEditing(false)}
                data-test-subj="contextDescriptionCancelButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDescriptionPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.description.CANCEL,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.cancelButton"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={handleSave}
                isLoading={isSaving}
                isDisabled={!descriptionValidation.valid}
                data-test-subj="contextDescriptionSaveButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDescriptionPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.description.SAVE,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : aiIndex?.description ? (
        <EuiText size="s">
          <p>{aiIndex.description}</p>
        </EuiText>
      ) : (
        <AiIndexDetailPanelEmptyPrompt
          iconType="text"
          dataTestSubj="contextAiIndexDescriptionEmpty"
          title={
            isManaged ? (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.description.emptyManaged"
                defaultMessage="No description yet."
              />
            ) : (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.description.empty"
                defaultMessage="No description yet"
              />
            )
          }
        />
      )}
    </EuiPanel>
  );
};
