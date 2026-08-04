/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Storybook mock — replicates real InputActions layout without ConnectorSelector/useKibana.

import { EuiButtonEmpty, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { SERVICE_PROVIDERS } from '@kbn/inference-endpoint-ui-common';
import React from 'react';

interface InputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
  agentId?: string;
}

export const InputActions: React.FC<InputActionsProps> = ({ onSubmit, isSubmitDisabled }) => (
  <EuiFlexItem grow={false}>
    <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem grow={false} style={{ minWidth: 0, overflow: 'hidden', flexShrink: 1 }}>
        <EuiButtonEmpty size="s" flush="left" color="text">
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={SERVICE_PROVIDERS.anthropic.icon} size="s" />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>Anthropic Claude Sonnet 4.6</EuiFlexItem>
          </EuiFlexGroup>
        </EuiButtonEmpty>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="m" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="image" size="s" color="text" aria-label="Attach image" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="sortUp"
              display="fill"
              size="s"
              disabled={isSubmitDisabled}
              onClick={onSubmit}
              aria-label="Submit"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);
