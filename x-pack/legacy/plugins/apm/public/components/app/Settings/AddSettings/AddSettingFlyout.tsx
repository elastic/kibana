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
  EuiButtonEmpty
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
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle>
                {selectedConfig ? (
                  <h2>Edit configuration</h2>
                ) : (
                  <h2>Create configuration</h2>
                )}
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiBetaBadge
                label="Beta"
                tooltipContent="This feature is not GA. Please help us by reporting any bugs."
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiText>
            <p>
              This is where you define the configuration you want to sync to
              your service and agent. This initial version is supported by the
              Elastic APM Java agent and for sample rate configuration only. We
              will continue to add support for Agent configuration for other
              agents and add more configuration options in future releases.
            </p>
          </EuiText>
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
