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
import { useInstallProductDoc } from '../../api/product_docs/use_install_product_doc';
import { useGetProductDocStatus } from '../../api/product_docs/use_get_product_doc_status';
import * as i18n from './translations';

export const ProductDocumentationManagement: React.FC = React.memo(() => {
  const { mutateAsync: installProductDoc, isLoading: isInstalling } = useInstallProductDoc();
  const { data: status, isLoading: isStatusLoading, isFetched } = useGetProductDocStatus();

  const onClickInstall = useCallback(() => {
    installProductDoc();
  }, [installProductDoc]);

  const content = useMemo(() => {
    if (isStatusLoading) {
      return <EuiLoadingSpinner data-test-subj="statusLoading" size="m" />;
    }
    if (status?.overall === 'installing' || isInstalling) {
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
  }, [isInstalling, isStatusLoading, onClickInstall, status?.overall]);

  if (!isFetched || status?.overall === 'installed') {
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
