/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCheckbox,
  EuiConfirmModal,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ConfirmDeleteRegionPolicyModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const ConfirmDeleteRegionPolicyModal: React.FC<ConfirmDeleteRegionPolicyModalProps> = ({
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  const { euiTheme } = useEuiTheme();
  const modalTitleId = useGeneratedHtmlId();
  const acknowledgeId = useGeneratedHtmlId({ prefix: 'confirmDeleteRegionPolicyAcknowledge' });
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <EuiConfirmModal
      maxWidth={euiTheme.base * 30}
      aria-labelledby={modalTitleId}
      titleProps={{ id: modalTitleId, 'data-test-subj': 'confirmDeleteRegionPolicyTitle' }}
      title={i18n.translate('xpack.searchInferenceEndpoints.manageRegions.deleteConfirm.title', {
        defaultMessage: 'Reset region preferences to default?',
      })}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.manageRegions.deleteConfirm.cancelButtonLabel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.manageRegions.deleteConfirm.confirmButtonLabel',
        { defaultMessage: 'Reset to default' }
      )}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      isLoading={isDeleting}
      confirmButtonDisabled={!acknowledged || isDeleting}
      data-test-subj="confirmDeleteRegionPolicyModal"
    >
      <EuiText size="s">
        <p data-test-subj="confirmDeleteRegionPolicyDescription">
          {i18n.translate(
            'xpack.searchInferenceEndpoints.manageRegions.deleteConfirm.description',
            {
              defaultMessage:
                'Removing your custom region preferences allows inference in all locations. Any new regions Elastic Inference Service adds will be allowed automatically.',
            }
          )}
        </p>
        <p data-test-subj="confirmDeleteRegionPolicyReconfigureNote">
          <strong>
            {i18n.translate(
              'xpack.searchInferenceEndpoints.manageRegions.deleteConfirm.reconfigureNote',
              {
                defaultMessage:
                  "You'll need to set new region preferences to restrict inference again.",
              }
            )}
          </strong>
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiCheckbox
        id={acknowledgeId}
        checked={acknowledged}
        onChange={(e) => setAcknowledged(e.target.checked)}
        disabled={isDeleting}
        data-test-subj="confirmDeleteRegionPolicyAcknowledge"
        label={i18n.translate(
          'xpack.searchInferenceEndpoints.manageRegions.deleteConfirm.acknowledgeLabel',
          { defaultMessage: 'I understand this resets my region preferences' }
        )}
      />
    </EuiConfirmModal>
  );
};
