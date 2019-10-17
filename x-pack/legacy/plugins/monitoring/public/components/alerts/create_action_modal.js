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
  EuiSpacer
} from '@elastic/eui';
import { ManageEmailAction } from './manage_email_action';

export function CreateActionModal({ onClose, createEmailAction, isNew, editAction }) {
  return (
    <EuiOverlayMask>
      <EuiModal onClose={onClose} initialFocus="[name=popswitch]">
        <EuiModalHeader>
          <EuiModalHeaderTitle>Create email action</EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiText>
            <p>
              Please create an email action to use for Kibana alerts.
            </p>
          </EuiText>
          <EuiSpacer/>
          <ManageEmailAction
            createEmailAction={createEmailAction}
            isNew={isNew}
            action={editAction}
          />
        </EuiModalBody>
      </EuiModal>
    </EuiOverlayMask>
  );
}
