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
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { useSaveAiIndexDescription } from '../../hooks/use_save_ai_index_description';

interface DescriptionPanelProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export const DescriptionPanel = ({ isLoading, aiIndex, onSaved }: DescriptionPanelProps) => {
  const { saveDescription, isSaving } = useSaveAiIndexDescription();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEditing = () => {
    setDraft(aiIndex?.description ?? '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!aiIndex) {
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
        </EuiFlexItem>
        {!isEditing && (
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              iconType="pencil"
              onClick={startEditing}
              isDisabled={aiIndex === undefined}
              data-test-subj="contextEditDescriptionButton"
            >
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.description.editButton"
                defaultMessage="Edit"
              />
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {isLoading ? (
        <EuiSkeletonText lines={2} />
      ) : isEditing ? (
        <>
          <EuiTextArea
            fullWidth
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={MAX_AI_INDEX_DESCRIPTION_LENGTH}
            data-test-subj="contextDescriptionTextArea"
            aria-label={i18n.translate('xpack.contextEngine.aiIndexDetail.description.ariaLabel', {
              defaultMessage: 'AI index description',
            })}
            placeholder={i18n.translate(
              'xpack.contextEngine.aiIndexDetail.description.placeholder',
              { defaultMessage: 'Describe what this AI index is for.' }
            )}
          />
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => setIsEditing(false)}
                isDisabled={isSaving}
                data-test-subj="contextDescriptionCancelButton"
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
                data-test-subj="contextDescriptionSaveButton"
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.description.saveButton"
                  defaultMessage="Save"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ) : (
        <EuiText size="s" color={aiIndex?.description ? undefined : 'subdued'}>
          <p>
            {aiIndex?.description ?? (
              <FormattedMessage
                id="xpack.contextEngine.aiIndexDetail.description.empty"
                defaultMessage="No sources yet — add a source and a summary will be generated automatically."
              />
            )}
          </p>
        </EuiText>
      )}
    </EuiPanel>
  );
};
