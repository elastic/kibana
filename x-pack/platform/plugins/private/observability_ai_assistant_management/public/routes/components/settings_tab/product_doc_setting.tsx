/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiCallOut,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiLink,
  EuiBadge,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/public';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { useKibana } from '../../../hooks/use_kibana';

const statusToLabelMap: Record<Exclude<InstallationStatus, 'error'> | 'loading', string> = {
  installing: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installingText',
    { defaultMessage: 'Installing...' }
  ),
  uninstalling: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.uninstallingText',
    { defaultMessage: 'Uninstalling...' }
  ),
  installed: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installedLabel',
    { defaultMessage: 'Installed' }
  ),
  uninstalled: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.notInstalledLabel',
    { defaultMessage: 'Not installed' }
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

  const isLoading =
    isProductDocInstalling ||
    isProductDocUninstalling ||
    status.value?.productDocStatus === 'installing' ||
    status.value?.productDocStatus === 'uninstalling';

  const productDocStatus: InstallationStatus | 'loading' =
    !status || isLoading ? 'loading' : status.value?.productDocStatus ?? 'uninstalled';

  const badgeColor: 'success' | 'default' | 'warning' | 'hollow' = (() => {
    if (productDocStatus === 'installed') return 'success';
    if (
      productDocStatus === 'installing' ||
      productDocStatus === 'uninstalling' ||
      productDocStatus === 'loading'
    )
      return 'hollow';
    if (status?.value?.productDocStatus === 'error') return 'warning';
    return 'default';
  })();

  const statusLabel =
    status?.value?.productDocStatus === 'error'
      ? i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.notAvailableLabel', {
          defaultMessage: 'Not available',
        })
      : statusToLabelMap[productDocStatus];

  const installLink = (
    <EuiLink
      data-test-subj="settingsTabInstallProductDocLink"
      onClick={onClickInstall}
      aria-disabled={!canInstallProductDoc || !isLoading}
    >
      <EuiIcon type="importAction" size="s" />{' '}
      {i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocLink',
        { defaultMessage: 'Install' }
      )}
    </EuiLink>
  );

  const uninstallLink = (
    <EuiLink
      data-test-subj="settingsTabUninstallProductDocLink"
      onClick={onClickUninstall}
      aria-disabled={isLoading}
    >
      <EuiIcon type="cross" size="s" /> {}
      {i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.uninstallProductDocLink',
        { defaultMessage: 'Uninstall' }
      )}
    </EuiLink>
  );

  return (
    <>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={{ marginTop: 8, gap: '4px', marginBottom: 16 }}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            •{' '}
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.productDocStatusPrefix',
              { defaultMessage: 'Elastic documentation' }
            )}{' '}
            <EuiIcon type="beaker" size="s" />
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.productDocStatus',
              { defaultMessage: ' status:' }
            )}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={badgeColor} data-test-subj="productDocStatusBadge">
            {statusLabel}
          </EuiBadge>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          {status?.value?.productDocStatus === 'error' ? (
            <EuiLink
              data-test-subj="settingsTabRetryProductDocLink"
              onClick={onClickInstall}
              aria-disabled={isLoading}
            >
              {i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.retryLink', {
                defaultMessage: 'Retry',
              })}
              {}
            </EuiLink>
          ) : productDocStatus === 'installed' ? (
            uninstallLink
          ) : canInstallProductDoc ? (
            installLink
          ) : (
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.installDisabledTooltip',
                { defaultMessage: 'Knowledge Base has to be installed first.' }
              )}
            >
              <EuiText color="subdued" size="s">
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocLinkDisabled',
                  { defaultMessage: 'Install' }
                )}
              </EuiText>
            </EuiToolTip>
          )}
        </EuiFlexItem>
      </EuiFlexGroup>

      {status?.value?.productDocStatus === 'error' && (
        <EuiFlexGroup gutterSize="s" css={{ padding: 8 }}>
          <EuiFlexItem grow={false}>
            <EuiCallOut
              color="warning"
              iconType="iInCircle"
              size="s"
              style={{
                marginLeft: 0,
                width: '528px',
                display: 'flex',
                padding: '8px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
              }}
              data-test-subj="productDocNotAvailableCallout"
              title={
                <span>
                  {i18n.translate(
                    'xpack.observabilityAiAssistantManagement.settingsPage.productDocNotAvailableTitle',
                    {
                      defaultMessage:
                        'The Elastic Documentation is not available. Try doing ABC and DCE to side-load the product docs and make them available to Kibana. Check our',
                    }
                  )}{' '}
                  <EuiLink
                    href="https://www.elastic.co/docs/explore-analyze/ai-assistant#observability-ai-assistant-requirements"
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.observabilityAiAssistantManagement.settingsPage.documentation',
                      { defaultMessage: 'documentation' }
                    )}
                  </EuiLink>{' '}
                </span>
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </>
  );
}
