/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

export interface CreatePolicyModalProps {
  onCancel: () => void;
  onSave: () => void;
}

export function OverrideSettingsModal({ onCancel, onSave }: CreatePolicyModalProps) {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId} style={{ width: '576px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId} data-test-subj="createPolicyModalTitle">
          {i18n.translate('xpack.streams.overrideSettingsModal.title', {
            defaultMessage: 'This will override index template settings',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.overrideSettingsModal.body', {
            defaultMessage:
              'This stream is currently configured to inherit retention and downsampling from an index template. By making this change, you will no longer be inheriting those settings and your changes will be applied to this stream alone. Are you sure you wish to proceed?',
          })}
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty data-test-subj="overrideSettingsModal-cancelButton" onClick={onCancel}>
              {i18n.translate('xpack.streams.overrideSettingsModal.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton data-test-subj="overrideSettingsModal-overrideButton" fill onClick={onSave}>
              {i18n.translate('xpack.streams.overrideSettingsModal.overrideButton', {
                defaultMessage: 'Yes, override index template',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
