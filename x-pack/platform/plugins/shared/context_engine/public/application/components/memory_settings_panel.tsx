/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSkeletonText,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface MemorySettingsPanelProps {
  checked: boolean;
  onChange: () => void;
  toggleTestSubject: string;
  disabled?: boolean;
  isLoading?: boolean;
  loadingTestSubject?: string;
}

export const MemorySettingsPanel = ({
  checked,
  onChange,
  toggleTestSubject,
  disabled = false,
  isLoading = false,
  loadingTestSubject,
}: MemorySettingsPanelProps) => (
  <EuiPanel hasBorder paddingSize="l">
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h2>
            <FormattedMessage
              id="xpack.contextEngine.memorySettings.memoryTitle"
              defaultMessage="Memory"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.contextEngine.memorySettings.memoryDescription"
              defaultMessage="Allow agents to save memories in this AI index."
            />
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {isLoading ? (
          <EuiSkeletonText lines={1} data-test-subj={loadingTestSubject} css={{ width: 100 }} />
        ) : (
          <EuiSwitch
            label={
              <FormattedMessage
                id="xpack.contextEngine.memorySettings.enableMemoryToggleSwitch"
                defaultMessage="Enable memory"
              />
            }
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            data-test-subj={toggleTestSubject}
            compressed
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
