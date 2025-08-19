/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiText,
  EuiBadge,
  EuiLink,
  EuiCallOut,
  EuiIcon,
  EuiTextColor,
  useEuiTheme,
  EuiIconTip,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { UseKnowledgeBaseResult } from '@kbn/ai-assistant/src/hooks';
import { InferenceModelState } from '@kbn/observability-ai-assistant-plugin/public';
import type { InstallationStatus } from '@kbn/product-doc-base-plugin/common/install_status';
import { useKibana } from '../../../hooks/use_kibana';

const statusToButtonTextMap: Record<Exclude<InstallationStatus, 'error'>, string> = {
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
    { defaultMessage: 'Installed' }
  ),
  uninstalled: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocButtonLabel',
    { defaultMessage: 'Not Installed' }
  ),
};

export function ProductDocSetting({
  knowledgeBase,
  currentlyDeployedInferenceId,
}: {
  knowledgeBase: UseKnowledgeBaseResult;
  currentlyDeployedInferenceId: string | undefined;
}) {
  const { overlays } = useKibana().services;
  const [actionError, setActionError] = useState<string | null>(null);
  const { euiTheme } = useEuiTheme();

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

  const isLoading =
    isProductDocInstalling ||
    isProductDocUninstalling ||
    status?.value?.productDocStatus === 'installing' ||
    status?.value?.productDocStatus === 'uninstalling';

  const productDocStatus: InstallationStatus =
    isProductDocInstalling || status?.value?.productDocStatus === 'installing'
      ? 'installing'
      : isProductDocUninstalling || status?.value?.productDocStatus === 'uninstalling'
      ? 'uninstalling'
      : status?.value?.productDocStatus ?? 'uninstalled';

  const hasBackendError = status?.value?.productDocStatus === 'error';
  const showErrorCallout = hasBackendError || Boolean(actionError);

  const badgeColor: 'success' | 'default' | 'warning' = (() => {
    if (productDocStatus === 'installed') return 'success';
    if (hasBackendError) return 'warning';
    return 'default';
  })();

  const statusLabel = hasBackendError
    ? i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.notAvailableLabel', {
        defaultMessage: 'Not available',
      })
    : statusToButtonTextMap[productDocStatus];

  const onClickInstall = useCallback(async () => {
    try {
      setActionError(null);
      if (!currentlyDeployedInferenceId) {
        throw new Error('Inference ID is required to install product documentation');
      }
      await installProductDoc(currentlyDeployedInferenceId);
    } catch (e) {
      setActionError(
        i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.productDocInstallErrorTitle',
          {
            defaultMessage: 'Elastic documentation failed to install',
          }
        ) + `: ${msg}`
      );
    }
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

  const onRetry = useCallback(async () => {
    try {
      setActionError(null);
      if (!currentlyDeployedInferenceId) {
        throw new Error('Inference ID is required to install product documentation');
      }
      await installProductDoc(currentlyDeployedInferenceId);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }, [installProductDoc, currentlyDeployedInferenceId]);

  const linkCss = useMemo(
    () =>
      ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: euiTheme.size.xs,
        fontWeight: euiTheme.font.weight.regular,
      } as const),
    [euiTheme]
  );

  const retryLink = useMemo(() => {
    if (isLoading) return null;
    if (!(showErrorCallout || hasBackendError)) return null;

    const label = i18n.translate(
      'xpack.observabilityAiAssistantManagement.settingsPage.retryLinkLabel',
      { defaultMessage: 'Retry' }
    );

    const link = (
      <EuiLink
        onClick={onRetry}
        color="primary"
        data-test-subj="productDocRetryLink"
        aria-disabled={!canInstallProductDoc}
        css={linkCss}
      >
        <EuiIcon type="refresh" size="s" data-test-subj="productDocRetryIcon" />

        <span> {label}</span>
      </EuiLink>
    );

    return canInstallProductDoc ? (
      link
    ) : (
      <EuiToolTip
        position="top"
        content={i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.installDissabledTooltip',
          { defaultMessage: 'Knowledge Base has to be installed first.' }
        )}
      >
        <EuiTextColor color="subdued" component="span">
          {link}
        </EuiTextColor>
      </EuiToolTip>
    );
  }, [isLoading, showErrorCallout, hasBackendError, canInstallProductDoc, onRetry, linkCss]);

  const actionLink = useMemo(() => {
    if (isLoading) return null;

    if (productDocStatus === 'installed') {
      return (
        <EuiLink
          onClick={onClickUninstall}
          color="primary"
          data-test-subj="productDocActionLink"
          aria-label="Uninstall Elastic documentation"
          css={linkCss}
        >
          <EuiIcon type="cross" size="s" />{' '}
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.uninstallLinkLabel',
            { defaultMessage: 'Uninstall' }
          )}
        </EuiLink>
      );
    }

    const link = (
      <EuiLink
        onClick={onClickInstall}
        color="primary"
        data-test-subj="productDocActionLink"
        aria-disabled={!canInstallProductDoc}
        css={linkCss}
      >
        {canInstallProductDoc &&
          status?.value?.inferenceModelState !== InferenceModelState.NOT_INSTALLED && (
            <>
              <EuiIcon type="download" size="s" />
              <span>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.installLinkLabel',
                  { defaultMessage: 'Install' }
                )}
              </span>
            </>
          )}
      </EuiLink>
    );

    return canInstallProductDoc ? (
      link
    ) : (
      <EuiToolTip
        position="top"
        content={i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.installDissabledTooltip',
          { defaultMessage: 'Knowledge Base has to be installed first.' }
        )}
      >
        <EuiTextColor color="subdued" component="span">
          {link}
        </EuiTextColor>
      </EuiToolTip>
    );
  }, [
    isLoading,
    productDocStatus,
    onClickUninstall,
    onClickInstall,
    canInstallProductDoc,
    status,
    linkCss,
  ]);

  const techPreviewLabel = i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.techPreviewAriaLabel',
    { defaultMessage: 'Technical preview' }
  );

  return (
    <>
      <div css={{ marginBottom: '16px', marginTop: '8px' }}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              •{' '}
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.productDocStatusPrefix',
                { defaultMessage: 'Elastic documentation ' }
              )}{' '}
              <EuiIconTip position="bottom" content={techPreviewLabel} type="beaker" size="s" />
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
            {isLoading && (
              <EuiLoadingSpinner
                size="s"
                data-test-subj="observabilityAiAssistantKnowledgeBaseLoadingSpinner"
              />
            )}
          </EuiFlexItem>
          {retryLink && <EuiFlexItem grow={false}>{retryLink}</EuiFlexItem>}

          {actionLink && <EuiFlexItem grow={false}>{actionLink}</EuiFlexItem>}
        </EuiFlexGroup>
      </div>
      {(showErrorCallout || hasBackendError) && (
        <EuiCallOut
          title={
            <span style={{ fontWeight: 'normal' }}>
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.productDocNotAvailableLine1',
                {
                  defaultMessage:
                    'The Elastic Documentation is not available. Try doing ABC and DCE to side-load the product docs and make them available to Kibana.',
                }
              )}
              <br />
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.productDocNotAvailableLine2Prefix',
                { defaultMessage: 'Check our ' }
              )}
              <EuiLink
                href="https://www.elastic.co/docs/explore-analyze/ai-assistant#observability-ai-assistant-requirements"
                target="_blank"
                external
              >
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.documentation',
                  { defaultMessage: 'documentation' }
                )}
              </EuiLink>
            </span>
          }
          color="warning"
          style={{ width: 528 }}
          iconType="iInCircle"
          size="s"
          data-test-subj="productDocNotAvailableCallout"
        />
      )}
    </>
  );
}
