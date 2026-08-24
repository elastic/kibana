/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';

import { AddIntegrationModal } from './add_integration_modal';

// Design-prototype-only page, separate from the AWS onboarding wizard
// prototype. Just enough scaffolding to open the real deliverable — the
// "Add data" button below opens the pixel-matched Sources modal.
export const IntegrationsVisionPage: React.FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="l">
            <h1>Integrations</h1>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="plusCircle"
            onClick={() => setIsModalOpen(true)}
            data-test-subj="addDataButton"
          >
            Add data
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="l" />

      {isModalOpen && <AddIntegrationModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
