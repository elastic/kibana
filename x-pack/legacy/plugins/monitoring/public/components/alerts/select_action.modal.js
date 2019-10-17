/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiText,
  EuiSpacer,
  EuiLink,
  EuiSuperSelect,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton
} from '@elastic/eui';

export function SelectActionModal({
  emailActions,
  onClose,
  createKibanaAlerts,
  onClickEdit,
  selectedEmailActionId,
  setSelectedEmailActionId
}) {
  const options = emailActions.map(action => ({
    value: action.id,
    inputDisplay: (
      <EuiText>
        {action.config.service} from {action.config.from}
        &nbsp;
        <EuiLink onClick={() => onClickEdit(action)}>
          edit
        </EuiLink>
      </EuiText>
    ),
    dropdownDisplay: (
      <EuiText>
        {action.config.service} from {action.config.from}
      </EuiText>
    )
  }));

  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Select email action</EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiText>
            <p>
              Please select a configured email action to use for Kibana alerts.
            </p>
          </EuiText>
          <EuiSpacer/>
          <EuiSuperSelect
            options={options}
            valueOfSelected={selectedEmailActionId}
            onChange={id => setSelectedEmailActionId(id)}
          />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButtonEmpty onClick={onClose}>Cancel</EuiButtonEmpty>
          <EuiButton
            onClick={() => {
              onClose();
              selectedEmailActionId && createKibanaAlerts();
            }}
            fill
          >
            Use
          </EuiButton>
        </EuiModalFooter>
      </EuiModal>
    </EuiOverlayMask>
  );
}
