/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { KbnInfoCallout } from '@kbn/ui-callout';

import { AddIntegrationModal, AddIntegrationModalPortabilityNote } from './add_integration_modal';

// Design-prototype-only page. Completely separate from the AWS onboarding
// wizard prototype — this one is exploring a different, longer-term
// question: instead of a full page per entry point, can "adding an
// integration" be a single portable modal opened from wherever the user
// already is? Two entry points are mocked up below (the global "Add data"
// nav action, and the integrations catalog page), both opening the exact
// same modal component to prove the experience is entry-point-agnostic.
export const IntegrationsVisionPage: React.FunctionComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
      <KbnInfoCallout
        title="Design prototype — not a real feature"
        text={
          <p>
            This page mocks up two places a user might start adding an integration from. Both
            buttons below open the same modal — the point of this skeleton is to test whether a
            single, portable browsing experience can replace separate pages per entry point.
          </p>
        }
        data-test-subj="integrationsVisionDisclaimer"
      />
      <EuiSpacer size="l" />

      <EuiTitle size="l">
        <h1>Integrations — long-term add flow (vision)</h1>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AddIntegrationModalPortabilityNote />
      <EuiSpacer size="xl" />

      {/* Entry point 1 — mocked global nav "Add data" action */}
      <EuiTitle size="xs">
        <h2>Entry point 1: global nav</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="s" style={{ maxWidth: 480 }}>
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="logoElastic" size="l" aria-hidden="true" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              Project navigation (mocked)
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content="Add data" disableScreenReaderOutput>
              <EuiButtonIcon
                display="fill"
                iconType="plusCircle"
                size="m"
                aria-label="Add data"
                onClick={() => setIsModalOpen(true)}
                data-test-subj="addDataNavButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <EuiSpacer size="xl" />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="xl" />

      {/* Entry point 2 — mocked integrations catalog page header */}
      <EuiTitle size="xs">
        <h2>Entry point 2: integrations catalog page</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiPanel hasBorder paddingSize="m" style={{ maxWidth: 480 }}>
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>Integrations</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              iconType="plusCircle"
              onClick={() => setIsModalOpen(true)}
              data-test-subj="browseCatalogButton"
            >
              Browse integrations
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {isModalOpen && <AddIntegrationModal onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
