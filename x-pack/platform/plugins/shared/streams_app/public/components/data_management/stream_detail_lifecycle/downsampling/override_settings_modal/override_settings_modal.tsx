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

export interface OverrideSettingsModalProps {
  onCancel: () => void;
  onSave: () => void;
}

export function OverrideSettingsModal({ onCancel, onSave }: OverrideSettingsModalProps) {
  const modalTitleId = useGeneratedHtmlId();

  return (
    <EuiModal onClose={onCancel} aria-labelledby={modalTitleId} style={{ width: '576px' }}>
      <EuiModalHeader>
        <EuiModalHeaderTitle id={modalTitleId} data-test-subj="overrideSettingsModalTitle">
          {i18n.translate('xpack.streams.overrideSettingsModal.title', {
            defaultMessage: 'This will override index template settings',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText>
          {i18n.translate('xpack.streams.overrideSettingsModal.body', {
            defaultMessage:
              'This stream currently inherits its retention and downsampling settings from an index template. Saving these changes will override these inherited settings and apply only to this stream alone.',
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
                defaultMessage: 'Override index template',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
