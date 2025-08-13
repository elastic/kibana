/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiButton,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/public';
import { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { useKibana } from '../../../hooks/use_kibana';

const statusToButtonTextMap: Record<Exclude<InstallationStatus, 'error'> | 'loading', string> = {
  installing: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installingText',
    { defaultMessage: 'Installing...' }
  ),
  uninstalling: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.uninstallingText',
    { defaultMessage: 'Uninstalling...' }
  ),
  installed: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.uninstallProductDocButtonLabel',
    { defaultMessage: 'Uninstall' }
  ),
  uninstalled: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocButtonLabel',
    { defaultMessage: 'Install' }
  ),
  loading: i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.loadingText', {
    defaultMessage: 'Loading...',
  }),
};

export function ProductDocSetting({
  knowledgeBase,
  currentlyDeployedInferenceId,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  currentlyDeployedInferenceId: string | undefined;
}) {
  const { overlays } = useKibana().services;

  const {
    status,
    isProductDocInstalling,
    isProductDocUninstalling,
    installProductDoc,
    uninstallProductDoc,
  } = knowledgeBase;

  const canInstallProductDoc =
    currentlyDeployedInferenceId !== undefined &&
    !(knowledgeBase.isInstalling || knowledgeBase.isWarmingUpModel) &&
    status?.value?.inferenceModelState === InferenceModelState.READY;

  const onClickInstall = useCallback(() => {
    if (!currentlyDeployedInferenceId) {
      throw new Error('Inference ID is required to install product documentation');
    }
    installProductDoc(currentlyDeployedInferenceId);
  }, [installProductDoc, currentlyDeployedInferenceId]);

  const onClickUninstall = useCallback(() => {
    overlays
      .openConfirm(
        i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.productDocUninstallConfirmText',
          {
            defaultMessage: `Are you sure you want to uninstall the Elastic documentation?`,
          }
        ),
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.productDocUninstallConfirmTitle',
            {
              defaultMessage: `Uninstalling Elastic documentation`,
            }
          ),
        }
      )
      .then((confirmed) => {
        if (confirmed && currentlyDeployedInferenceId) {
          uninstallProductDoc(currentlyDeployedInferenceId);
        }
      });
  }, [overlays, uninstallProductDoc, currentlyDeployedInferenceId]);

  const buttonText = useMemo(() => {
    if (!status || status.value?.productDocStatus === 'error' || !canInstallProductDoc) {
      return statusToButtonTextMap.uninstalled;
    }
    if (
      (isProductDocInstalling || isProductDocUninstalling) &&
      status.value?.productDocStatus !== 'installing' &&
      status.value?.productDocStatus !== 'uninstalling'
    ) {
      return statusToButtonTextMap.loading;
    }
    return statusToButtonTextMap[status.value?.productDocStatus || 'uninstalled'];
  }, [status, isProductDocInstalling, isProductDocUninstalling, canInstallProductDoc]);

  const isLoading =
    isProductDocInstalling ||
    isProductDocUninstalling ||
    status.value?.productDocStatus === 'installing' ||
    status.value?.productDocStatus === 'uninstalling';

  const content = useMemo(() => {
    if (!isLoading && canInstallProductDoc && status.value?.productDocStatus === 'installed') {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiHealth textSize="s" color="success">
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocInstalledLabel',
                { defaultMessage: 'Installed' }
              )}
            </EuiHealth>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="settingsTabUninstallProductDocButton"
              onClick={onClickUninstall}
              color="warning"
            >
              {buttonText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    const installButton = (
      <EuiButton
        data-test-subj="settingsTabInstallProductDocButton"
        onClick={onClickInstall}
        disabled={!canInstallProductDoc}
        isLoading={isLoading}
      >
        {buttonText}
      </EuiButton>
    );

    return (
      <EuiFlexGroup justifyContent="flexStart" alignItems="center">
        <EuiFlexItem grow={false}>
          {canInstallProductDoc ? (
            installButton
          ) : (
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.installDissabledTooltip',
                {
                  defaultMessage: 'Knowledge Base has to be installed first.',
                }
              )}
            >
              {installButton}
            </EuiToolTip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [canInstallProductDoc, onClickInstall, onClickUninstall, status, buttonText, isLoading]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <h3>
          {i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.productDocLabel', {
            defaultMessage: 'Elastic documentation',
          })}
        </h3>
      }
      description={
        <p>
          <em>
            {i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.techPreview', {
              defaultMessage: '[technical preview] ',
            })}
          </em>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.productDocDescription',
            {
              defaultMessage:
                "Install Elastic documentation to improve the assistant's efficiency.",
            }
          )}
        </p>
      }
    >
      <EuiFormRow fullWidth>{content}</EuiFormRow>
    </EuiDescribedFormGroup>
  );
}
