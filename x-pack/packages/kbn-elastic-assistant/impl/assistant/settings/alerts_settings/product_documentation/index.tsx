/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useUninstallProductDoc } from '../../../api/product_docs/use_uninstall_product_doc';
import { useInstallProductDoc } from '../../../api/product_docs/use_install_product_doc';
import { useGetProductDocStatus } from '../../../api/product_docs/use_get_product_doc_status';
import * as i18n from './translations';
import { useAssistantContext } from '../../../../..';

export const ProductDocumentationManagement: React.FC = React.memo(() => {
  const { overlays } = useAssistantContext();
  const [isInstalled, setInstalled] = useState<boolean>(true);
  const [isInstalling, setInstalling] = useState<boolean>(false);

  const { mutateAsync: installProductDoc } = useInstallProductDoc();
  const { mutateAsync: uninstallProductDoc } = useUninstallProductDoc();
  const { status, isLoading: isStatusLoading } = useGetProductDocStatus();

  useEffect(() => {
    if (status) {
      setInstalled(status.overall === 'installed');
    }
  }, [status]);

  const onClickInstall = useCallback(() => {
    setInstalling(true);
    installProductDoc().then(
      () => {
        setInstalling(false);
        setInstalled(true);
      },
      () => {
        setInstalling(false);
        setInstalled(false);
      }
    );
  }, [installProductDoc]);

  const onClickUninstall = useCallback(() => {
    overlays
      .openConfirm(i18n.OPEN_CONFIRM_TEXT, {
        title: i18n.OPEN_CONFIRM_TITLE,
      })
      .then((confirmed) => {
        if (confirmed) {
          uninstallProductDoc().then(() => {
            setInstalling(false);
            setInstalled(false);
          });
        }
      });
  }, [overlays, uninstallProductDoc]);

  const content = useMemo(() => {
    if (isStatusLoading) {
      return <EuiLoadingSpinner size="m" />;
    }
    if (isInstalling) {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiLoadingSpinner size="m" />
          <EuiText size="s">{i18n.INSTALLING}</EuiText>
        </EuiFlexGroup>
      );
    }
    if (isInstalled) {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiHealth textSize="s" color="success">
              {i18n.INSTALLED}
            </EuiHealth>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="settingsTabUninstallProductDocButton"
              onClick={onClickUninstall}
              color="warning"
            >
              {i18n.UNINSTALL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }
    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="settingsTabInstallProductDocButton" onClick={onClickInstall}>
            {i18n.INSTALL}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [isInstalled, isInstalling, isStatusLoading, onClickInstall, onClickUninstall]);

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l" title={i18n.LABEL}>
      <EuiTitle size="m">
        <h3>{i18n.LABEL}</h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiText size="m">
        <span>{i18n.DESCRIPTION}</span>
      </EuiText>
      <EuiSpacer size="l" />
      {content}
    </EuiPanel>
  );
});

ProductDocumentationManagement.displayName = 'ProductDocumentationManagement';
