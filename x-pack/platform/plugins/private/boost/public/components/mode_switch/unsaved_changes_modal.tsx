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
import type { SimpleModeDefaults } from '../../../common/types';
import { DATA_STREAMS_WINDOW_OPTIONS, INDICES_PRESET_OPTIONS } from '../preset_options';

interface UnsavedChangesModalProps {
  savedDefaults: SimpleModeDefaults;
  draft: SimpleModeDefaults;
  isSaving: boolean;
  onCancel: () => void;
  /** Discards the changes, then turns on advanced mode. */
  onDiscard: () => void;
  /** Saves the changes, then turns on advanced mode. */
  onSave: () => void;
}

const getLabel = <TId extends string>(
  options: ReadonlyArray<{ id: TId; label: string }>,
  id: TId
): string => options.find((option) => option.id === id)?.label ?? id;

/**
 * Asks whether to save or discard unsaved simple-mode changes before turning on advanced mode,
 * which would otherwise lose them.
 */
export const UnsavedChangesModal = ({
  savedDefaults,
  draft,
  isSaving,
  onCancel,
  onDiscard,
  onSave,
}: UnsavedChangesModalProps) => {
  const titleId = useGeneratedHtmlId();

  // Each changed setting, from what's saved to what's chosen.
  const changes = [
    ...(draft.indices !== savedDefaults.indices
      ? [
          i18n.translate('xpack.boost.unsavedChangesModal.indicesChange', {
            defaultMessage: 'Indices: {from} to {to}',
            values: {
              from: getLabel(INDICES_PRESET_OPTIONS, savedDefaults.indices),
              to: getLabel(INDICES_PRESET_OPTIONS, draft.indices),
            },
          }),
        ]
      : []),
    ...(draft.data_streams.window !== savedDefaults.data_streams.window
      ? [
          i18n.translate('xpack.boost.unsavedChangesModal.dataStreamsChange', {
            defaultMessage: 'Data streams: {from} to {to}',
            values: {
              from: getLabel(DATA_STREAMS_WINDOW_OPTIONS, savedDefaults.data_streams.window),
              to: getLabel(DATA_STREAMS_WINDOW_OPTIONS, draft.data_streams.window),
            },
          }),
        ]
      : []),
  ];

  return (
    <EuiModal
      aria-labelledby={titleId}
      onClose={onCancel}
      maxWidth={576}
      data-test-subj="boostUnsavedChangesModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.boost.unsavedChangesModal.title', {
            defaultMessage: 'Save changes before turning on advanced mode?',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EuiText size="s">
          <p>
            {i18n.translate('xpack.boost.unsavedChangesModal.body', {
              defaultMessage:
                "These changes to your simple mode settings haven't been saved. Save them to keep them, or discard them.",
            })}
          </p>
          <ul>
            {changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </EuiText>
      </EuiModalBody>

      <EuiModalFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} data-test-subj="boostUnsavedChangesCancel">
              {i18n.translate('xpack.boost.unsavedChangesModal.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              color="danger"
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
