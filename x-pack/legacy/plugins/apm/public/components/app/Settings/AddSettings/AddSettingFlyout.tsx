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
  EuiButton
} from '@elastic/eui';
import React from 'react';
import { AddSettingFlyoutBody } from './AddSettingFlyoutBody';

interface Props {
  onClose: () => void;
  onSubmit: () => void;
  isOpen: boolean;
}

export function AddSettingsFlyout({ onClose, isOpen, onSubmit }: Props) {
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
                <h2>Create configuration</h2>
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
              Please note only sample rate configuration is supported in this
              first version. We will extend support for central configuration in
              future releases. As this feature is in beta, please beware of
              bugs.
            </p>
          </EuiText>
          <EuiHorizontalRule margin="m" />
          <AddSettingFlyoutBody onSubmit={onSubmit} />
        </EuiFlyoutBody>
        {/* TODO: Add save submit function from AddSettingFlyoutBody */}
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
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
