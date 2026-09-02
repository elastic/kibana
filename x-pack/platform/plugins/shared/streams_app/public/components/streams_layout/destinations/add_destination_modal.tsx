/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCheckableCard,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useState } from 'react';
import {
  ADD_DESTINATION_MODAL_NAME_HELP,
  ADD_DESTINATION_MODAL_NAME_LABEL,
  ADD_DESTINATION_MODAL_NAME_PLACEHOLDER,
  ADD_DESTINATION_MODAL_SUBMIT,
  ADD_DESTINATION_MODAL_TITLE,
  ADD_DESTINATION_MODAL_TYPE_LABEL,
  CANCEL_BUTTON_LABEL,
  EXTERNAL_BADGE_LABEL,
  INTERNAL_BADGE_LABEL,
} from './translations';

export function AddDestinationModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (details: { name: string; isInternal: boolean }) => void;
}) {
  const titleId = useGeneratedHtmlId({ prefix: 'addDestinationModalTitle' });
  const typeGroupId = useGeneratedHtmlId({ prefix: 'addDestinationType' });
  const [name, setName] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const trimmedName = name.trim();

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      style={{ width: 480 }}
      data-test-subj="streamsDestinationsAddModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>{ADD_DESTINATION_MODAL_TITLE}</EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiFormRow
          label={ADD_DESTINATION_MODAL_NAME_LABEL}
          helpText={ADD_DESTINATION_MODAL_NAME_HELP}
          fullWidth
        >
          <EuiFieldText
            fullWidth
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ADD_DESTINATION_MODAL_NAME_PLACEHOLDER}
            aria-label={ADD_DESTINATION_MODAL_NAME_LABEL}
            data-test-subj="streamsDestinationsAddModalName"
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={ADD_DESTINATION_MODAL_TYPE_LABEL} fullWidth>
          <div>
            <EuiCheckableCard
              id={`${typeGroupId}-internal`}
              name={typeGroupId}
              label={INTERNAL_BADGE_LABEL}
              value="internal"
              checked={isInternal}
              onChange={() => setIsInternal(true)}
              data-test-subj="streamsDestinationsAddModalTypeInternal"
            />
            <EuiSpacer size="s" />
            <EuiCheckableCard
              id={`${typeGroupId}-external`}
              name={typeGroupId}
              label={EXTERNAL_BADGE_LABEL}
              value="external"
              checked={!isInternal}
              onChange={() => setIsInternal(false)}
              data-test-subj="streamsDestinationsAddModalTypeExternal"
            />
          </div>
        </EuiFormRow>
      </EuiModalBody>
      <EuiModalFooter>
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onClose} data-test-subj="streamsDestinationsAddModalCancel">
              {CANCEL_BUTTON_LABEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              disabled={trimmedName.length === 0}
              onClick={() => onAdd({ name: trimmedName, isInternal })}
              data-test-subj="streamsDestinationsAddModalSubmit"
            >
              {ADD_DESTINATION_MODAL_SUBMIT}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalFooter>
    </EuiModal>
  );
}
