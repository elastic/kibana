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
import { i18n } from '@kbn/i18n';

interface UnsavedChangesModalProps {
  /** How many settings have unsaved changes. */
  changeCount: number;
  isSaving: boolean;
  /** Closes the modal, keeping the changes and staying in simple mode. */
  onClose: () => void;
  /** Discards the changes, then turns on advanced mode. */
  onDiscard: () => void;
  /** Saves the changes, then turns on advanced mode. */
  onSave: () => void;
}

/**
 * Asks whether to save or discard unsaved simple-mode changes before turning on advanced mode,
 * which would otherwise lose them. Closing it stays in simple mode.
 */
export const UnsavedChangesModal = ({
  changeCount,
  isSaving,
  onClose,
  onDiscard,
  onSave,
}: UnsavedChangesModalProps) => {
  const titleId = useGeneratedHtmlId();

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onClose}
      maxWidth={576}
      data-test-subj="boostUnsavedChangesModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.boost.unsavedChangesModal.title', {
            defaultMessage: 'Unsaved changes detected',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.boost.unsavedChangesModal.body', {
              defaultMessage:
                '{count, plural, one {# unsaved setting change has been detected. Would you like to save or discard this change before switching to advanced mode?} other {# unsaved setting changes have been detected. Would you like to save or discard these changes before switching to advanced mode?}}',
              values: { count: changeCount },
            })}
          </p>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            {/* Like the page's own discard button: picking the settings again undoes it. */}
            <EuiButtonEmpty
              onClick={onDiscard}
              isDisabled={isSaving}
              data-test-subj="boostUnsavedChangesDiscard"
            >
              {i18n.translate('xpack.boost.unsavedChangesModal.discardButton', {
                defaultMessage: 'Discard changes',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={onSave}
              isLoading={isSaving}
              data-test-subj="boostUnsavedChangesSave"
            >
              {i18n.translate('xpack.boost.unsavedChangesModal.saveButton', {
                defaultMessage: 'Save changes',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
};
