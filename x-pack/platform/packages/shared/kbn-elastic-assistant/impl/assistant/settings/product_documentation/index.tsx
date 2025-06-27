/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { useInstallProductDoc } from '../../api/product_docs/use_install_product_doc';
import * as i18n from './translations';

export const ProductDocumentationManagement = React.memo<{
  status?: InstallationStatus;
  inferenceId: string;
}>(({ status, inferenceId }) => {
  const {
    mutateAsync: installProductDoc,
    isSuccess: isInstalled,
    isLoading: isInstalling,
  } = useInstallProductDoc();

  const onClickInstall = useCallback(() => {
    installProductDoc(inferenceId);
  }, [installProductDoc, inferenceId]);

  const content = useMemo(() => {
    if (isInstalling) {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiLoadingSpinner size="m" data-test-subj="installing" />
          <EuiText size="s">{i18n.INSTALLING}</EuiText>
        </EuiFlexGroup>
      );
    }
    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            data-test-subj="settingsTabInstallProductDocButton"
            onClick={onClickInstall}
          >
            {i18n.INSTALL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [isInstalling, onClickInstall]);

  // The last condition means that the installation was started by the plugin
  if (
    !status ||
    status === 'installed' ||
    isInstalled ||
    (status === 'installing' && !isInstalling)
  ) {
    return null;
  }

  return (
    <>
      <EuiCallOut title={i18n.LABEL} iconType="info">
        <EuiText size="m">
          <span>{i18n.DESCRIPTION}</span>
        </EuiText>
        <EuiSpacer size="m" />
        {content}
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
});

ProductDocumentationManagement.displayName = 'ProductDocumentationManagement';
