/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ActiveSource } from '../../types/connector';

interface ConfirmDeleteActiveSourceModalProps {
  activeSource: ActiveSource;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const ConfirmDeleteActiveSourceModal: React.FC<ConfirmDeleteActiveSourceModalProps> = ({
  activeSource,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  const modalTitleId = useGeneratedHtmlId({ prefix: 'deleteActiveSourceModalTitle' });

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId} role="alertdialog">
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId}>
          <FormattedMessage
            id="xpack.dataSources.deleteActiveSourceModal.title"
            defaultMessage="Delete {name}"
            values={{ name: activeSource.name }}
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.dataSources.deleteActiveSourceModal.description"
              defaultMessage="Are you sure you want to delete this data source? This action cannot be undone."
            />
          </p>
        </EuiText>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiButtonEmpty onClick={onCancel} isDisabled={isDeleting}>
          <FormattedMessage
            id="xpack.dataSources.deleteActiveSourceModal.cancelButton"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>
        <EuiButton
          onClick={onConfirm}
          color="danger"
          fill
          isLoading={isDeleting}
          data-test-subj="confirmDeleteActiveSourceButton"
        >
          <FormattedMessage
            id="xpack.dataSources.deleteActiveSourceModal.confirmButton"
            defaultMessage="Delete"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
