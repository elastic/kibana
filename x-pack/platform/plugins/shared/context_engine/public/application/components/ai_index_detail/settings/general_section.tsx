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
  EuiSkeletonText,
  EuiSpacer,
  EuiTextArea,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { MAX_AI_INDEX_DESCRIPTION_LENGTH } from '../../../../../common/constants';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import { useSaveAiIndexDescription } from '../../../hooks/use_save_ai_index_description';
import { getTextInputHardMaxLength, validateTextInput } from '../../../utils/validate_text_input';
import { SettingsPanel } from './settings_panel';
import { SettingsRow } from './settings_row';

interface GeneralSectionProps {
  isLoading: boolean;
  aiIndex: GetAiIndexResponse | undefined;
  onSaved: () => void;
}

export const GeneralSection = ({ isLoading, aiIndex, onSaved }: GeneralSectionProps) => {
  const { saveDescription, isSaving } = useSaveAiIndexDescription();
  const [edited, setEdited] = useState<string>();
  const isManaged = aiIndex?.managed === true;
  const saved = aiIndex?.description ?? '';
  const description = edited ?? saved;
  const validation = validateTextInput({
    value: description,
    maxLength: MAX_AI_INDEX_DESCRIPTION_LENGTH,
  });
  const isDirty = edited !== undefined && edited.trim() !== saved.trim();

  const save = async () => {
    if (!aiIndex || !validation.valid) {
      return;
    }
    if (await saveDescription(aiIndex, description)) {
      setEdited(undefined);
      onSaved();
    }
  };

  return (
    <SettingsPanel
      data-test-subj="contextAiIndexSettingsGeneral"
      title={
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.settings.general.title"
          defaultMessage="General"
        />
      }
    >
      <SettingsRow
        title={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.settings.general.descriptionTitle"
            defaultMessage="Description"
          />
        }
        description={
          <FormattedMessage
            id="xpack.contextEngine.aiIndexDetail.settings.general.descriptionHelp"
            defaultMessage="Agents read this to decide when to use the index."
          />
        }
      >
        {isLoading ? (
          <EuiSkeletonText lines={2} />
        ) : (
          <EuiFormRow
            fullWidth
            isInvalid={validation.error !== undefined}
            error={validation.error}
            helpText={validation.warning}
          >
            <EuiTextArea
              fullWidth
              rows={3}
              value={description}
              onChange={(event) => setEdited(event.target.value)}
              maxLength={getTextInputHardMaxLength(MAX_AI_INDEX_DESCRIPTION_LENGTH)}
              isInvalid={validation.error !== undefined}
              disabled={isManaged || isSaving}
              aria-label={i18n.translate(
                'xpack.contextEngine.aiIndexDetail.settings.general.descriptionAriaLabel',
                { defaultMessage: 'AI index description' }
              )}
              data-test-subj="contextDescriptionTextArea"
            />
          </EuiFormRow>
        )}
      </SettingsRow>
      {isDirty && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={() => setEdited(undefined)}
                isDisabled={isSaving}
                data-test-subj="contextDescriptionCancelButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDescriptionPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.description.CANCEL,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.settings.general.discard"
                  defaultMessage="Discard"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                size="s"
                onClick={save}
                isLoading={isSaving}
                isDisabled={!validation.valid}
                data-test-subj="contextDescriptionSaveButton"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageDescriptionPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.description.SAVE,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.settings.general.save"
                  defaultMessage="Save changes"
                />
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </SettingsPanel>
  );
};
