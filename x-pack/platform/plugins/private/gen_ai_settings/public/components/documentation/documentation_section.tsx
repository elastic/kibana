/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { ResourceTypes } from '@kbn/product-doc-common';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  useProductDocStatus,
  useInstallProductDoc,
  useUninstallProductDoc,
  type ProductDocBasePluginStart,
} from '@kbn/product-doc-base-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import type { DocumentationItem, DocumentationStatus } from './types';
import { ELASTIC_DOCS_ID, SECURITY_LABS_ID } from './types';
import * as i18n from './translations';

interface DocumentationSectionProps {
  productDocBase: ProductDocBasePluginStart;
}

export const DocumentationSection: React.FC<DocumentationSectionProps> = ({ productDocBase }) => {
  const { services } = useKibana();
  const { notifications, application, rendering, docLinks } = services;

  // Check if user has Agent Builder 'All' privileges (manageAgents capability)
  const hasManagePrivilege = application.capabilities.agentBuilder?.manageAgents === true;

  const {
    status: productDocsStatusResponse,
    isLoading: isLoadingProductDocs,
    refetch: refetchProductDocs,
  } = useProductDocStatus(productDocBase);

  const {
    status: securityLabsStatusResponse,
    isLoading: isLoadingSecurityLabs,
    refetch: refetchSecurityLabs,
  } = useProductDocStatus(productDocBase, {
    inferenceId: defaultInferenceEndpoints.ELSER,
    resourceType: ResourceTypes.securityLabs,
  });

  const isLoading = isLoadingProductDocs || isLoadingSecurityLabs;

  const refetch = useCallback(() => {
    refetchProductDocs();
    refetchSecurityLabs();
  }, [refetchProductDocs, refetchSecurityLabs]);

  const installMutation = useInstallProductDoc(productDocBase, {
    onSuccess: () => {
      notifications.toasts.addSuccess({ title: i18n.INSTALL_SUCCESS });
    },
    onError: (error) => {
      const message = error.body?.message ?? error.message;
      notifications.toasts.addDanger({
        title: i18n.INSTALL_ERROR,
        text: toMountPoint(
          <EuiText size="s">
            <p>{message}</p>
            <p>{i18n.AIR_GAPPED_HINT}</p>
            <p>
              <EuiLink href={docLinks.links.aiAssistantSettings} target="_blank" external>
                {i18n.LEARN_MORE}
              </EuiLink>
            </p>
          </EuiText>,
          rendering
        ),
      });
    },
  });
  const { mutate: installDoc, isLoading: isInstalling } = installMutation;

  const uninstallMutation = useUninstallProductDoc(productDocBase, {
    onSuccess: () => {
      notifications.toasts.addSuccess({ title: i18n.UNINSTALL_SUCCESS });
    },
    onError: (error) => {
      notifications.toasts.addError(new Error(error.body?.message ?? error.message), {
        title: i18n.UNINSTALL_ERROR,
      });
    },
  });
  const { mutate: uninstallDoc, isLoading: isUninstalling } = uninstallMutation;

  const handleInstall = useCallback(
    (itemId: string) => {
      if (itemId === ELASTIC_DOCS_ID) {
        installDoc(defaultInferenceEndpoints.ELSER);
      }
      if (itemId === SECURITY_LABS_ID) {
        installDoc({
          inferenceId: defaultInferenceEndpoints.ELSER,
          resourceType: ResourceTypes.securityLabs,
        });
      }
    },
    [installDoc]
  );

  const handleUninstall = useCallback(
    (itemId: string) => {
      if (itemId === ELASTIC_DOCS_ID) {
        uninstallDoc(defaultInferenceEndpoints.ELSER);
      }
      if (itemId === SECURITY_LABS_ID) {
        uninstallDoc({
          inferenceId: defaultInferenceEndpoints.ELSER,
          resourceType: ResourceTypes.securityLabs,
        });
      }
    },
    [uninstallDoc]
  );

  const handleRetry = useCallback(
    (itemId: string) => {
      handleInstall(itemId);
    },
    [handleInstall]
  );

  const documentationItems: DocumentationItem[] = useMemo(() => {
    const elasticDocsStatus: DocumentationStatus =
      (productDocsStatusResponse && 'overall' in productDocsStatusResponse
        ? productDocsStatusResponse.overall
        : 'uninstalled') ?? 'uninstalled';
    const securityLabsStatus: DocumentationStatus =
      (securityLabsStatusResponse && 'status' in securityLabsStatusResponse
        ? securityLabsStatusResponse.status
        : 'uninstalled') ?? 'uninstalled';
    const securityLabsUpdateAvailable =
      securityLabsStatusResponse &&
      'isUpdateAvailable' in securityLabsStatusResponse &&
      Boolean(securityLabsStatusResponse.isUpdateAvailable);

    return [
      {
        id: ELASTIC_DOCS_ID,
        name: i18n.ELASTIC_DOCS_NAME,
        status: elasticDocsStatus,
        isTechPreview: false,
        isStubbed: false,
        icon: 'logoElastic',
      },
      {
        id: SECURITY_LABS_ID,
        name: i18n.SECURITY_LABS_NAME,
        status: securityLabsStatus,
        updateAvailable: securityLabsUpdateAvailable,
        isTechPreview: false,
        isStubbed: false,
        icon: 'logoSecurity',
      },
    ];
  }, [productDocsStatusResponse, securityLabsStatusResponse]);

  const getStatusBadge = useCallback((itemStatus: DocumentationStatus) => {
    // Status badge only shows binary state: Installed or Not installed
    // Action states (installing/uninstalling) are shown in the action button
    switch (itemStatus) {
      case 'installed':
        return <EuiBadge color="success">{i18n.STATUS_INSTALLED}</EuiBadge>;
      case 'uninstalling':
        return <EuiBadge color="success">{i18n.STATUS_INSTALLED}</EuiBadge>;
      case 'error':
        return <EuiBadge color="danger">{i18n.STATUS_ERROR}</EuiBadge>;
      case 'not_available':
        return <EuiBadge color="warning">{i18n.STATUS_NOT_AVAILABLE}</EuiBadge>;
      case 'installing':
      case 'uninstalled':
      default:
        return <EuiBadge color="hollow">{i18n.STATUS_NOT_INSTALLED}</EuiBadge>;
    }
  }, []);

  const getActionButton = useCallback(
    (item: DocumentationItem) => {
      const installItemId =
        installMutation.variables && typeof installMutation.variables === 'object'
          ? installMutation.variables.resourceType === ResourceTypes.securityLabs
            ? SECURITY_LABS_ID
            : ELASTIC_DOCS_ID
          : ELASTIC_DOCS_ID;

      const uninstallItemId =
        uninstallMutation.variables && typeof uninstallMutation.variables === 'object'
          ? uninstallMutation.variables.resourceType === ResourceTypes.securityLabs
            ? SECURITY_LABS_ID
            : ELASTIC_DOCS_ID
          : ELASTIC_DOCS_ID;

      // Use server status OR local mutation state to determine if action is in progress
      const isItemInstalling =
        item.status === 'installing' || (isInstalling && item.id === installItemId);
      const isItemUninstalling =
        item.status === 'uninstalling' || (isUninstalling && item.id === uninstallItemId);

      // Helper to wrap button with tooltip when user lacks privileges
      const wrapWithPrivilegeTooltip = (button: React.ReactElement) => {
        if (!hasManagePrivilege) {
          return (
            <EuiToolTip content={i18n.INSUFFICIENT_PRIVILEGES} position="top">
              {button}
            </EuiToolTip>
          );
        }
        return button;
      };

      // Stubbed items show disabled install button
      if (item.isStubbed && item.status !== 'not_available') {
        return wrapWithPrivilegeTooltip(
          <EuiButtonEmpty
            size="xs"
            iconType="download"
            isDisabled={true}
            data-test-subj={`documentation-install-${item.id}`}
          >
            {i18n.ACTION_INSTALL}
          </EuiButtonEmpty>
        );
      }

      // Not available - show retry
      if (item.status === 'not_available') {
        return wrapWithPrivilegeTooltip(
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={hasManagePrivilege ? () => refetch() : undefined}
            isDisabled={!hasManagePrivilege}
            data-test-subj={`documentation-retry-${item.id}`}
          >
            {i18n.ACTION_RETRY}
          </EuiButtonEmpty>
        );
      }

      // Error state - show retry
      if (item.status === 'error') {
        return wrapWithPrivilegeTooltip(
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={hasManagePrivilege ? () => handleRetry(item.id) : undefined}
            isDisabled={!hasManagePrivilege}
            data-test-subj={`documentation-retry-${item.id}`}
          >
            {i18n.ACTION_RETRY}
          </EuiButtonEmpty>
        );
      }

      // Uninstalling - show loading state
      if (isItemUninstalling) {
        return (
          <EuiButtonEmpty
            size="xs"
            isLoading={true}
            isDisabled={true}
            data-test-subj={`documentation-uninstalling-${item.id}`}
          >
            {i18n.STATUS_UNINSTALLING}
          </EuiButtonEmpty>
        );
      }

      // Installed - show uninstall button
      if (item.status === 'installed') {
        if (item.updateAvailable) {
          return wrapWithPrivilegeTooltip(
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="flexEnd"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="refresh"
                  onClick={hasManagePrivilege ? () => handleInstall(item.id) : undefined}
                  isDisabled={!hasManagePrivilege}
                  data-test-subj={`documentation-update-${item.id}`}
                >
                  {i18n.ACTION_UPDATE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="returnKey"
                  onClick={hasManagePrivilege ? () => handleUninstall(item.id) : undefined}
                  isDisabled={!hasManagePrivilege}
                  data-test-subj={`documentation-uninstall-${item.id}`}
                >
                  {i18n.ACTION_UNINSTALL}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }

        return wrapWithPrivilegeTooltip(
          <EuiButtonEmpty
            size="xs"
            iconType="returnKey"
            onClick={hasManagePrivilege ? () => handleUninstall(item.id) : undefined}
            isDisabled={!hasManagePrivilege}
            data-test-subj={`documentation-uninstall-${item.id}`}
          >
            {i18n.ACTION_UNINSTALL}
          </EuiButtonEmpty>
        );
      }

      // Installing - show loading state
      if (isItemInstalling) {
        return (
          <EuiButtonEmpty
            size="xs"
            isLoading={true}
            isDisabled={true}
            data-test-subj={`documentation-installing-${item.id}`}
          >
            {i18n.STATUS_INSTALLING}
          </EuiButtonEmpty>
        );
      }

      // Default - show install button
      return wrapWithPrivilegeTooltip(
        <EuiButtonEmpty
          size="xs"
          iconType="download"
          onClick={hasManagePrivilege ? () => handleInstall(item.id) : undefined}
          isDisabled={!hasManagePrivilege}
          data-test-subj={`documentation-install-${item.id}`}
        >
          {i18n.ACTION_INSTALL}
        </EuiButtonEmpty>
      );
    },
    [
      handleInstall,
      handleUninstall,
      handleRetry,
      isInstalling,
      isUninstalling,
      refetch,
      hasManagePrivilege,
      installMutation.variables,
      uninstallMutation.variables,
    ]
  );

  const columns: Array<EuiBasicTableColumn<DocumentationItem>> = useMemo(
    () => [
      {
        field: 'name',
        name: i18n.COLUMN_NAME,
        sortable: false,
        render: (name: string, item: DocumentationItem) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiIcon type={item.icon ?? 'documents'} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{name}</EuiText>
            </EuiFlexItem>
            {item.isTechPreview && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge label={i18n.TECH_PREVIEW} size="s" alignment="middle" />
              </EuiFlexItem>
            )}
            {item.updateAvailable && (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">{i18n.UPDATE_AVAILABLE}</EuiBadge>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'status',
        name: i18n.COLUMN_STATUS,
        sortable: false,
        width: '300px',
        render: (itemStatus: DocumentationStatus) => getStatusBadge(itemStatus),
      },
      {
        field: 'actions',
        name: i18n.COLUMN_ACTIONS,
        sortable: false,
        width: '150px',
        align: 'right',
        render: (_: unknown, item: DocumentationItem) => getActionButton(item),
      },
    ],
    [getStatusBadge, getActionButton]
  );

  return (
    <EuiSplitPanel.Outer hasBorder grow={false} data-test-subj="documentationSection">
      <EuiSplitPanel.Inner color="subdued">
        <EuiTitle size="s">
          <h3 data-test-subj="documentationTitle">{i18n.DOCUMENTATION_TITLE}</h3>
        </EuiTitle>
      </EuiSplitPanel.Inner>
      <EuiSplitPanel.Inner>
        <EuiText size="s" color="subdued">
          {i18n.DOCUMENTATION_DESCRIPTION}{' '}
          <EuiLink href={docLinks.links.aiAssistantSettings} target="_blank" external>
            {i18n.LEARN_MORE}
          </EuiLink>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiText size="xs" color="subdued">
          {i18n.SHOWING} <strong>1-{documentationItems.length}</strong> {i18n.OF}{' '}
          {documentationItems.length} <strong>{i18n.DOCUMENTATION_TITLE}</strong>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable
          items={documentationItems}
          columns={columns}
          loading={isLoading}
          data-test-subj="documentationTable"
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
