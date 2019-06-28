/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiTitle,
  EuiBetaBadge,
  EuiText,
  EuiHorizontalRule,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutFooter,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut
} from '@elastic/eui';
import React from 'react';
import { AddSettingFlyoutBody } from './AddSettingFlyoutBody';
import { Config } from '../ListSettings';

interface Props {
  onClose: () => void;
  onSubmit: () => void;
  isOpen: boolean;
  selectedConfig: Config | null;
}

export function AddSettingsFlyout({
  onClose,
  isOpen,
  onSubmit,
  selectedConfig
}: Props) {
  if (!isOpen) {
    return null;
  }
  return (
    <EuiPortal>
      <EuiFlyout size="s" onClose={onClose} ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle>
            {selectedConfig ? (
              <h2>Edit configuration</h2>
            ) : (
              <h2>Create configuration</h2>
            )}
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiCallOut
            title="APM Agent Configuration (BETA)"
            iconType="iInCircle"
            color="warning"
          >
            Please note only sample rate configuration is supported in this
            first version. We will extend support for central configuration in
            future releases. Please be aware of bugs.
          </EuiCallOut>
          <EuiHorizontalRule margin="m" />
          <AddSettingFlyoutBody
            selectedConfig={selectedConfig}
            onSubmit={onSubmit}
          />
        </EuiFlyoutBody>
        {/* TODO: Add save submit function from AddSettingFlyoutBody */}
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty isDisabled>Cancel</EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton fill isDisabled>
                Save configuration
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </EuiPortal>
  );
}
