/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiText,
  EuiBadge,
  EuiLink,
  EuiCallOut,
  EuiIcon,
  EuiTextColor,
  useEuiTheme,
  EuiBetaBadge,
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

type LabelStatus = Exclude<InstallationStatus, 'error'>;

const statusToLabelMap: Record<LabelStatus, string> = {
  installed: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocInstalledLabel',
    {
      defaultMessage: 'Installed',
    }
  ),
  uninstalled: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.status.uninstalled',
    {
      defaultMessage: 'Not installed',
    }
  ),
  installing: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.installingText',
    {
      defaultMessage: 'Installing…',
    }
  ),
  uninstalling: i18n.translate(
    'xpack.observabilityAiAssistantManagement.settingsPage.status.uninstalling',
    {
      defaultMessage: 'Uninstalling…',
    }
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
  const { euiTheme } = useEuiTheme();
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    status,
    isProductDocInstalling,
    isProductDocUninstalling,
    installProductDoc,
    uninstallProductDoc,
  } = knowledgeBase;

  const kb = status?.value;
  const kbProductDocStatus = kb?.productDocStatus;

  const canInstallProductDoc =
    currentlyDeployedInferenceId !== undefined &&
    !(knowledgeBase.isInstalling || knowledgeBase.isWarmingUpModel) &&
    kb?.inferenceModelState === InferenceModelState.READY;

  const isLoading =
    isProductDocInstalling ||
    isProductDocUninstalling ||
    kbProductDocStatus === 'installing' ||
    kbProductDocStatus === 'uninstalling';

  const productDocStatus: InstallationStatus =
    isProductDocInstalling || kbProductDocStatus === 'installing'
      ? 'installing'
      : isProductDocUninstalling || kbProductDocStatus === 'uninstalling'
      ? 'uninstalling'
      : kbProductDocStatus ?? 'uninstalled';

  const hasBackendError = kbProductDocStatus === 'error';
  const showErrorCallout = hasBackendError || Boolean(actionError);

  const badgeColor: 'success' | 'default' | 'warning' =
    productDocStatus === 'installed' ? 'success' : hasBackendError ? 'warning' : 'default';

  const statusLabel = hasBackendError
    ? i18n.translate('xpack.observabilityAiAssistantManagement.settingsPage.notAvailableLabel', {
        defaultMessage: 'Not available',
      })
    : statusToLabelMap[productDocStatus as LabelStatus];

  const linkCss = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: euiTheme.size.xs,
    fontWeight: euiTheme.font.weight.regular,
  } as const;

  const onClickInstall = useCallback(async () => {
    try {
      setActionError(null);
      if (!currentlyDeployedInferenceId) {
        throw new Error('Inference ID is required to install product documentation');
      }
      await installProductDoc(currentlyDeployedInferenceId);
    } catch (e) {
      const msg = e instanceof Error && e.message ? e.message : String(e);
      setActionError(
        i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.productDocInstallErrorTitle',
          { defaultMessage: 'Elastic documentation failed to install' }
        ) + `: ${msg}`
      );
    }
  }, [installProductDoc, currentlyDeployedInferenceId]);

  const onClickUninstall = useCallback(() => {
    overlays
      .openConfirm(
        i18n.translate(
          'xpack.observabilityAiAssistantManagement.settingsPage.productDocUninstallConfirmText',
          { defaultMessage: `Are you sure you want to uninstall the Elastic documentation?` }
        ),
        {
          title: i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.productDocUninstallConfirmTitle',
            { defaultMessage: `Uninstalling Elastic documentation` }
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

  const TechPreviewTip = (
    <EuiBetaBadge
      tooltipPosition="bottom"
      label=""
      tooltipContent={i18n.translate(
        'xpack.observabilityAiAssistantManagement.settingsPage.techPreviewAriaLabel',
        { defaultMessage: 'Technical preview' }
      )}
      iconType="beaker"
      size="s"
      anchorProps={{
        style: { verticalAlign: 'middle' },
      }}
    />
  );

  const RetryLink =
    !isLoading && showErrorCallout ? (
      canInstallProductDoc ? (
        <EuiLink
          onClick={onRetry}
          color="primary"
          data-test-subj="productDocRetryLink"
          css={linkCss}
        >
          <EuiIcon type="refresh" size="s" data-test-subj="productDocRetryIcon" />
          <span>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.retryLinkLabel',
              { defaultMessage: 'Retry' }
            )}
          </span>
        </EuiLink>
      ) : (
        <EuiToolTip
          position="top"
          content={i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.installDissabledTooltip',
            { defaultMessage: 'Knowledge Base has to be installed first.' }
          )}
        >
          <EuiTextColor color="subdued" component="span">
            <EuiLink
              onClick={onRetry}
              color="primary"
              data-test-subj="productDocRetryLink"
              aria-disabled
              css={linkCss}
            >
              <EuiIcon type="refresh" size="s" />
              <span>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.retryLinkLabel',
                  { defaultMessage: 'Retry' }
                )}
              </span>
            </EuiLink>
          </EuiTextColor>
        </EuiToolTip>
      )
    ) : null;

  const ActionLink = (() => {
    if (
      isLoading ||
      showErrorCallout ||
      kb?.inferenceModelState === InferenceModelState.NOT_INSTALLED
    )
      return null;

    if (productDocStatus === 'installed') {
      return (
        <EuiLink
          onClick={onClickUninstall}
          color="primary"
          data-test-subj="productDocActionLink"
          aria-label="Uninstall Elastic documentation"
          css={linkCss}
        >
          <EuiIcon type="cross" size="s" />
          <span>
            {i18n.translate(
              'xpack.observabilityAiAssistantManagement.settingsPage.uninstallProductDocButtonLabel',
              { defaultMessage: 'Uninstall' }
            )}
          </span>
        </EuiLink>
      );
    }

    const installInner = (
      <EuiLink
        onClick={onClickInstall}
        color="primary"
        data-test-subj="productDocActionLink"
        aria-disabled={!canInstallProductDoc}
        css={linkCss}
      >
        <EuiIcon type="download" size="s" />
        <span>
          {i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.installProductDocButtonLabel',
            { defaultMessage: 'Install' }
          )}
        </span>
      </EuiLink>
    );

    return canInstallProductDoc ? installInner : null;
  })();

  return (
    <>
      <div css={{ marginBottom: 16, marginTop: 8 }}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              •{' '}
              {i18n.translate(
                'xpack.observabilityAiAssistantManagement.settingsPage.productDocStatusPrefix',
                { defaultMessage: 'Elastic documentation ' }
              )}{' '}
              {TechPreviewTip}
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
                data-test-subj="observabilityAiAssistantProductDocLoadingSpinner"
              />
            )}
          </EuiFlexItem>

          {RetryLink && <EuiFlexItem grow={false}>{RetryLink}</EuiFlexItem>}
          {ActionLink && <EuiFlexItem grow={false}>{ActionLink}</EuiFlexItem>}
        </EuiFlexGroup>
      </div>

      {showErrorCallout && (
        <EuiCallOut
          announceOnMount
          color="warning"
          size="s"
          title={i18n.translate(
            'xpack.observabilityAiAssistantManagement.settingsPage.productDocNotAvailableTitle',
            { defaultMessage: 'The Elastic documentation is not available' }
          )}
          iconType="info"
          style={{ width: 528, marginBottom: 16 }}
          data-test-subj="productDocNotAvailableCallout"
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', columnGap: 8 }}>
            <EuiText size="s">
              <p>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.productDocNotAvailableLine1',
                  {
                    defaultMessage:
                      'If you are in an air-gapped environment, try using a local artifact to access the product docs and make them available to Kibana.',
                  }
                )}
              </p>
              <p>
                {i18n.translate(
                  'xpack.observabilityAiAssistantManagement.settingsPage.productDocNotAvailableLine2Prefix',
                  { defaultMessage: 'Check our ' }
                )}
                <EuiLink
                  href="https://www.elastic.co/docs/reference/kibana/configuration-reference/ai-assistant-settings"
                  target="_blank"
                  external
                >
                  {i18n.translate(
                    'xpack.observabilityAiAssistantManagement.settingsPage.documentation',
                    { defaultMessage: 'documentation' }
                  )}
                </EuiLink>
              </p>
            </EuiText>
          </div>
        </EuiCallOut>
      )}
    </>
  );
}
