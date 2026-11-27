/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const finishEditingFirst = i18n.translate('xpack.streams.processingFlyout.saveBlockedByEditor', {
  defaultMessage: 'Create, update or cancel the processor you are editing first.',
});

interface SaveAndApplyButtonProps {
  isSaving: boolean;
  /** Nothing can be saved: no changes, no permission, or a processor is still being edited. */
  isDisabled: boolean;
  /** A processor is open in the editor, which is why the button is disabled. */
  isEditing: boolean;
  onClick: () => void;
}

/** The flyout's save button, which says why it is disabled while a processor is being edited. */
export function SaveAndApplyButton({
  isSaving,
  isDisabled,
  isEditing,
  onClick,
}: SaveAndApplyButtonProps) {
  return (
    <EuiToolTip content={isEditing ? finishEditingFirst : undefined}>
      <EuiButton
        fill
        isLoading={isSaving}
        isDisabled={isDisabled}
        // Keeps the button focusable, so the tooltip is reachable by keyboard.
        hasAriaDisabled={isEditing}
        onClick={onClick}
        data-test-subj="streamsProcessingFlyoutSave"
      >
        {i18n.translate('xpack.streams.processingFlyout.save', {
          defaultMessage: 'Save and apply',
        })}
      </EuiButton>
    </EuiToolTip>
  );
}
