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
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useInstallProductDoc } from '../../api/product_docs/use_install_product_doc';
import { useGetProductDocStatus } from '../../api/product_docs/use_get_product_doc_status';
import * as i18n from './translations';

export const ProductDocumentationManagement: React.FC = React.memo(() => {
  const [{ isInstalled, isInstalling }, setState] = useState({
    isInstalled: true,
    isInstalling: false,
  });

  const { mutateAsync: installProductDoc } = useInstallProductDoc();
  const { status, isLoading: isStatusLoading } = useGetProductDocStatus();

  useEffect(() => {
    if (status) {
      setState((prevState) => ({
        ...prevState,
        isInstalled: status.overall === 'installed',
      }));
    }
  }, [status]);

  const onClickInstall = useCallback(async () => {
    setState((prevState) => ({ ...prevState, isInstalling: true }));
    try {
      await installProductDoc();
      setState({ isInstalled: true, isInstalling: false });
    } catch {
      setState({ isInstalled: false, isInstalling: false });
    }
  }, [installProductDoc]);

  const content = useMemo(() => {
    if (isStatusLoading) {
      return <EuiLoadingSpinner data-test-subj="statusLoading" size="m" />;
    }
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
  }, [isInstalling, isStatusLoading, onClickInstall]);

  if (isInstalled) {
    return null;
  }
  return (
    <>
      <EuiCallOut title={i18n.LABEL} iconType="iInCircle">
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
