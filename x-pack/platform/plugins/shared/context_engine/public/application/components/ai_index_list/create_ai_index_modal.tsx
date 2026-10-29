/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { DEFAULT_AI_INDEX_TYPE } from '../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { AI_INDEX_CREATED_LOCATION_STATE } from '../../ai_index_created_location_state';
import { useCreateAiIndex } from '../../hooks/use_create_ai_index';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexDetailPath } from '../../paths';
import { validateAiIndexId } from '../../utils/ai_index_dest';

interface CreateAiIndexModalProps {
  onClose: () => void;
}

export const CreateAiIndexModal = ({ onClose }: CreateAiIndexModalProps) => {
  const { navigateToContextEngine } = useNavigation();
  const { createAiIndex, isCreating } = useCreateAiIndex();
  const [id, setId] = useState('');
  const modalTitleId = useGeneratedHtmlId();
  const { dest, error: nameError } = validateAiIndexId(DEFAULT_AI_INDEX_TYPE, id);

  const createAndContinue = async () => {
    const created = await createAiIndex({ id, description: '', sources: [] });
    if (created) {
      navigateToContextEngine(
        getAiIndexDetailPath(created.id),
        undefined,
        AI_INDEX_CREATED_LOCATION_STATE
      );
    }
  };

  const closeModal = () => {
    if (!isCreating) {
      onClose();
    }
  };

  return (
    <EuiModal
      onClose={closeModal}
      data-test-subj="contextCreateAiIndexModal"
      aria-labelledby={modalTitleId}
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          {i18n.translate('xpack.contextEngine.createAiIndexModal.title', {
            defaultMessage: 'Create AI index',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.contextEngine.createAiIndex.name.title', {
            defaultMessage: 'Name',
          })}
          isInvalid={nameError !== undefined}
          error={nameError}
          helpText={i18n.translate('xpack.contextEngine.createAiIndex.name.helpTextEmpty', {
            defaultMessage:
              'Use lowercase letters, numbers, hyphens, and underscores. A backing index is generated from this name.',
          })}
        >
          <EuiFieldText
            fullWidth
            autoFocus
            value={id}
            isInvalid={nameError !== undefined}
            onChange={(event) => setId(event.target.value)}
            data-test-subj="contextAiIndexNameInput"
            placeholder={i18n.translate('xpack.contextEngine.createAiIndex.name.placeholder', {
              defaultMessage: 'e.g. support-ticket-triage',
            })}
            aria-label={i18n.translate('xpack.contextEngine.createAiIndex.name.ariaLabel', {
              defaultMessage: 'AI index name',
            })}
          />
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty
          onClick={closeModal}
          isDisabled={isCreating}
          data-test-subj="contextCreateAiIndexModalCancelButton"
        >
          {i18n.translate('xpack.contextEngine.createAiIndexModal.cancelButton', {
            defaultMessage: 'Cancel',
          })}
        </EuiButtonEmpty>
        <EuiButton
          fill
          data-test-subj="contextCreateAiIndexModalConfirmButton"
          onClick={createAndContinue}
          isLoading={isCreating}
          isDisabled={dest === undefined}
          {...getEbtProps({
            element: CONTEXT_ENGINE_UI_EBT.element.aiIndexCreateModal,
            action: CONTEXT_ENGINE_UI_EBT.action.aiIndexCreate.CREATE,
          })}
        >
          {i18n.translate('xpack.contextEngine.createAiIndex.continueButton', {
            defaultMessage: 'Create AI index',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
