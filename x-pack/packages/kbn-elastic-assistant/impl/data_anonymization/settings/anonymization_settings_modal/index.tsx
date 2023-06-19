/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiModal, EuiModalBody, EuiModalHeader } from '@elastic/eui';
import React from 'react';

import { AnonymizationSettings } from '../anonymization_settings';

interface Props {
  closeModal: () => void;
}

const AnonymizationSettingsModalComponent: React.FC<Props> = ({ closeModal }) => (
  <EuiModal onClose={closeModal}>
    <EuiModalHeader />
    <EuiModalBody>
      <AnonymizationSettings closeModal={closeModal} />
    </EuiModalBody>
  </EuiModal>
);

export const AnonymizationSettingsModal = React.memo(AnonymizationSettingsModalComponent);
