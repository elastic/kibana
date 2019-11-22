/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';

interface InstallationButtonProps {
  isLoading: boolean;
  isInstalled: boolean;
  onClick: () => void;
}
export function InstallationButton(props: InstallationButtonProps) {
  const { isLoading, isInstalled } = props;

  const installButton = (
    <EuiButton isLoading={isLoading} fill={true} onClick={props.onClick}>
      {isLoading ? 'Installing' : 'Install package'}
    </EuiButton>
  );

  return isInstalled ? installedButton : installButton;
}
const installedButton = (
  <EuiButtonEmpty iconType="check" disabled>
    This package is installed
  </EuiButtonEmpty>
);
