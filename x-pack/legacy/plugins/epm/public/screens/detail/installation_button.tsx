/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { InstallStatus } from '../../types';

interface InstallationButtonProps {
  installationStatus: InstallStatus;
  onClick: () => void;
}
export function InstallationButton(props: InstallationButtonProps) {
  const { installationStatus } = props;
  const isInstalling = installationStatus === InstallStatus.installing;
  const isInstalled = installationStatus === InstallStatus.installed;

  const installButton = (
    <EuiButton isLoading={isInstalling} fill={true} onClick={props.onClick}>
      {isInstalling ? 'Installing' : 'Install package'}
    </EuiButton>
  );

  return isInstalled ? installedButton : installButton;
}
const installedButton = (
  <EuiButtonEmpty iconType="check" disabled>
    This package is installed
  </EuiButtonEmpty>
);
