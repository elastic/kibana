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
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiLoadingSpinner,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { UseKnowledgeBaseResult } from '@kbn/ai-assistant';
import { getMappedInferenceId } from '../../../helpers/inference_utils';
import { useGetProductDoc } from '../../../hooks/use_get_product_doc';

export function ProductDocEntry({ knowledgeBase }: { knowledgeBase: UseKnowledgeBaseResult }) {
  const selectedInferenceId = getMappedInferenceId(knowledgeBase.status.value?.currentInferenceId);

  const canInstallProductDoc = selectedInferenceId !== undefined;

  const {
    status,
    isLoading: isStatusLoading,
    installProductDoc,
  } = useGetProductDoc(selectedInferenceId);

  const onClickInstall = useCallback(() => {
    if (!selectedInferenceId) {
      throw new Error('Inference ID is required to install product documentation');
    }
    installProductDoc(selectedInferenceId);
  }, [installProductDoc, selectedInferenceId]);

  const content = useMemo(() => {
    if (isStatusLoading || knowledgeBase.isInstalling) {
      return <EuiLoadingSpinner size="m" />;
    }
    if (status === 'installed' || knowledgeBase.status.value?.productDocStatus === 'installed') {
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
        </EuiFlexGroup>
      );
    }
    if (status === 'installing' || knowledgeBase.status.value?.productDocStatus === 'installing') {
      return (
        <EuiFlexGroup justifyContent="flexStart" alignItems="center">
          <EuiLoadingSpinner size="m" />
          <EuiText size="s">
            <FormattedMessage
              id="xpack.observabilityAiAssistantManagement.settingsPage.installingText"
              defaultMessage="Installing..."
            />
          </EuiText>
        </EuiFlexGroup>
      );
    }

    const installButton = (
      <EuiButton
        data-test-subj="settingsTabInstallProductDocButton"
        onClick={onClickInstall}
        disabled={!canInstallProductDoc}
      >
        {i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocButtonLabel',
          { defaultMessage: 'Install' }
        )}
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
  }, [canInstallProductDoc, isStatusLoading, onClickInstall, status, knowledgeBase]);

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
