/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiModal, EuiModalHeader, EuiModalBody, EuiModalFooter } from '@elastic/eui';

interface Props {
  onDismiss: () => void;
}

export const Modal: FunctionComponent<Props> = ({ onDismiss }) => {
  return (
    <EuiModal onClose={onDismiss}>
      <EuiModalHeader>Upload file</EuiModalHeader>
      <EuiModalBody>Upload file</EuiModalBody>
      <EuiModalFooter>OK</EuiModalFooter>
    </EuiModal>
  );
};
