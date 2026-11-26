/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface DeleteConfirmModalProps {
  fieldName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal = ({ fieldName, onCancel, onConfirm }: DeleteConfirmModalProps) => {
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={i18n.translate('xpack.dataFederation.mappingEditor.confirmRemoveFieldTitle', {
          defaultMessage: 'Remove field mapping?',
        })}
        aria-label={i18n.translate('xpack.dataFederation.mappingEditor.confirmRemoveFieldAria', {
          defaultMessage: 'Remove field mapping',
        })}
        onCancel={onCancel}
        onConfirm={onConfirm}
        cancelButtonText={i18n.translate(
          'xpack.dataFederation.mappingEditor.confirmRemoveFieldCancelButtonText',
          { defaultMessage: 'Cancel' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.dataFederation.mappingEditor.confirmRemoveFieldConfirmButtonText',
          { defaultMessage: 'Remove field' }
        )}
        buttonColor="danger"
        defaultFocusedButton="confirm"
        data-test-subj="dataFederationMappingEditorConfirmRemoveFieldModal"
      >
        <p>
          {i18n.translate('xpack.dataFederation.mappingEditor.confirmRemoveFieldBody', {
            defaultMessage: 'This will remove the mapping for "{fieldName}".',
            values: { fieldName },
          })}
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
