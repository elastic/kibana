/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiConfirmModal, EuiOverlayMask, EuiCallOut, EuiSpacer } from '@elastic/eui';

interface ConfirmPackageInstallProps {
  handleModal: () => void;
  handleInstall: () => void;
  packageName: string;
  numOfAssets: number;
}
export const ConfirmPackageInstall = (props: ConfirmPackageInstallProps) => {
  const { handleModal, handleInstall, packageName, numOfAssets } = props;
  return (
    <EuiOverlayMask>
      <EuiConfirmModal
        title={`Install ${packageName}?`}
        onCancel={handleModal}
        onConfirm={handleInstall}
        cancelButtonText="Cancel"
        confirmButtonText="Install package"
        defaultFocusedButton="confirm"
      >
        <EuiCallOut>This package will install {numOfAssets} assets.</EuiCallOut>
        <EuiSpacer size="l" />
        <p>
          and will only be accessible to users who have permission to view this Space. Elasticsearch
          assets are installed globally and will be accessible to all Kibana users.
        </p>
      </EuiConfirmModal>
    </EuiOverlayMask>
  );
};
