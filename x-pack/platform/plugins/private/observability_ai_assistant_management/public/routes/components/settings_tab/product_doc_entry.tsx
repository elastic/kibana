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
import { getMappedInferenceId } from '../../../helpers/inference_utils';
import { useKibana } from '../../../hooks/use_kibana';
import { useGetProductDoc } from '../../../hooks/use_get_product_doc';

export function ProductDocEntry({ knowledgeBase }: { knowledgeBase: UseKnowledgeBaseResult }) {
  const { overlays } = useKibana().services;

  const selectedInferenceId = getMappedInferenceId(knowledgeBase.status.value?.currentInferenceId);

  const canInstallProductDoc = selectedInferenceId !== undefined;

  const { status, installProductDoc, uninstallProductDoc } = useGetProductDoc(selectedInferenceId);

  const onClickInstall = useCallback(() => {
    if (!selectedInferenceId) {
      throw new Error('Inference ID is required to install product documentation');
    }
    installProductDoc(selectedInferenceId);
  }, [installProductDoc, selectedInferenceId]);

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
        if (confirmed && selectedInferenceId) {
          uninstallProductDoc(selectedInferenceId);
        }
      });
  }, [overlays, uninstallProductDoc, selectedInferenceId]);

  const buttonText = useMemo(() => {
    switch (status) {
      case 'installing':
        return i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.installingText',
          { defaultMessage: 'Installing...' }
        );
      case 'uninstalling':
        return i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.uninstallingText',
          { defaultMessage: 'Uninstalling...' }
        );
      case 'loading':
        return i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.loadingText', {
          defaultMessage: 'Loading...',
        });
      case 'installed':
        return i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.uninstallProductDocButtonLabel',
          { defaultMessage: 'Uninstall' }
        );
      case 'uninstalled':
      default:
        return i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocButtonLabel',
          { defaultMessage: 'Install' }
        );
    }
  }, [status]);

  const isLoading = status === 'loading' || status === 'installing' || status === 'uninstalling';

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
