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
import { KnowledgeBaseState } from '@kbn/observability-ai-assistant-plugin/public';
import { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { useKibana } from '../../../hooks/use_kibana';
import { UseProductDoc } from '../../../hooks/use_product_doc';

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

export function ProductDocEntry({
  knowledgeBase,
  productDoc,
  currentlyDeployedInferenceId,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  productDoc: UseProductDoc;
  currentlyDeployedInferenceId: string | undefined;
}) {
  const { overlays } = useKibana().services;

  const canInstallProductDoc =
    currentlyDeployedInferenceId !== undefined &&
    !(knowledgeBase.isInstalling || knowledgeBase.isWarmingUpModel || knowledgeBase.isPolling) &&
    knowledgeBase.status?.value?.kbState === KnowledgeBaseState.READY;

  const { status, isLoading: isStatusLoading, installProductDoc, uninstallProductDoc } = productDoc;

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
    if (!status || status === 'error' || !canInstallProductDoc) {
      return statusToButtonTextMap.uninstalled;
    }
    if (isStatusLoading && status !== 'installing' && status !== 'uninstalling') {
      return statusToButtonTextMap.loading;
    }
    return statusToButtonTextMap[status];
  }, [status, isStatusLoading, canInstallProductDoc]);

  const isLoading = isStatusLoading || status === 'installing' || status === 'uninstalling';

  const content = useMemo(() => {
    if (status === 'installed') {
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
