/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface Props {
  onConfirm: () => void;
  onCancel: () => void;
}

export const DisableRecommendedModelsModal: React.FC<Props> = ({ onConfirm, onCancel }) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.disableRecommendedModelsModal.title',
        { defaultMessage: 'Disable recommended models' }
      )}
      onCancel={onCancel}
      onConfirm={onConfirm}
      cancelButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.disableRecommendedModelsModal.cancel',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonText={i18n.translate(
        'xpack.searchInferenceEndpoints.settings.disableRecommendedModelsModal.confirm',
        { defaultMessage: 'Turn off recommended defaults' }
      )}
      buttonColor="primary"
      defaultFocusedButton="confirm"
      data-test-subj="disableRecommendedModelsModal"
    >
      <p>
        {i18n.translate(
          'xpack.searchInferenceEndpoints.settings.disableRecommendedModelsModal.body',
          {
            defaultMessage:
              "Elastic continuously tests and recommends specific models for optimal performance of a feature. Customizing the selected models may have adverse effects on the feature's performance.",
          }
        )}
      </p>
    </EuiConfirmModal>
  );
};
