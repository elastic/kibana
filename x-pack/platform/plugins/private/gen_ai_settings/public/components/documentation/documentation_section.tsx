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
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
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
  const { notifications } = services;

  const { status, isLoading, refetch } = useProductDocStatus(productDocBase);

  const { mutate: installDoc, isLoading: isInstalling } = useInstallProductDoc(productDocBase, {
    onSuccess: () => {
      notifications.toasts.addSuccess({ title: i18n.INSTALL_SUCCESS });
    },
    onError: (error) => {
      notifications.toasts.addError(new Error(error.body?.message ?? error.message), {
        title: i18n.INSTALL_ERROR,
      });
    },
  });

  const { mutate: uninstallDoc, isLoading: isUninstalling } = useUninstallProductDoc(
    productDocBase,
    {
      onSuccess: () => {
        notifications.toasts.addSuccess({ title: i18n.UNINSTALL_SUCCESS });
      },
      onError: (error) => {
        notifications.toasts.addError(new Error(error.body?.message ?? error.message), {
          title: i18n.UNINSTALL_ERROR,
        });
      },
    }
  );

  const handleInstall = useCallback(
    (itemId: string) => {
      if (itemId === ELASTIC_DOCS_ID) {
        installDoc(defaultInferenceEndpoints.ELSER);
      }
      // Security labs is stubbed - no action
    },
    [installDoc]
  );

  const handleUninstall = useCallback(
    (itemId: string) => {
      if (itemId === ELASTIC_DOCS_ID) {
        uninstallDoc(defaultInferenceEndpoints.ELSER);
      }
      // Security labs is stubbed - no action
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
    const elasticDocsStatus: DocumentationStatus = status?.overall ?? 'uninstalled';

    return [
      {
        id: ELASTIC_DOCS_ID,
        name: i18n.ELASTIC_DOCS_NAME,
        status: elasticDocsStatus,
        isTechPreview: true,
        isStubbed: false,
        icon: 'logoElastic',
      },
      {
        id: SECURITY_LABS_ID,
        name: i18n.SECURITY_LABS_NAME,
        status: 'uninstalled',
        isTechPreview: false,
        isStubbed: true,
        icon: 'logoSecurity',
      },
    ];
  }, [status]);

  const getStatusBadge = useCallback((itemStatus: DocumentationStatus) => {
    switch (itemStatus) {
      case 'installed':
        return <EuiBadge color="success">{i18n.STATUS_INSTALLED}</EuiBadge>;
      case 'installing':
        // During installation, keep showing "Not installed" - the action column shows the spinner
        return <EuiBadge color="hollow">{i18n.STATUS_NOT_INSTALLED}</EuiBadge>;
      case 'uninstalling':
        // During uninstallation, keep showing "Installed" - the action column shows the spinner
        return <EuiBadge color="success">{i18n.STATUS_INSTALLED}</EuiBadge>;
      case 'error':
        return <EuiBadge color="danger">{i18n.STATUS_ERROR}</EuiBadge>;
      case 'not_available':
        return <EuiBadge color="warning">{i18n.STATUS_NOT_AVAILABLE}</EuiBadge>;
      case 'uninstalled':
      default:
        return <EuiBadge color="hollow">{i18n.STATUS_NOT_INSTALLED}</EuiBadge>;
    }
  }, []);

  const getActionButton = useCallback(
    (item: DocumentationItem) => {
      // Check both local mutation state AND server-reported status
      const isItemInstalling =
        (isInstalling && item.id === ELASTIC_DOCS_ID && item.status !== 'installed') ||
        item.status === 'installing';
      const isItemUninstalling =
        (isUninstalling && item.id === ELASTIC_DOCS_ID && item.status === 'installed') ||
        item.status === 'uninstalling';

      // Stubbed items show disabled install button
      if (item.isStubbed && item.status !== 'not_available') {
        return (
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
        return (
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={() => refetch()}
            data-test-subj={`documentation-retry-${item.id}`}
          >
            {i18n.ACTION_RETRY}
          </EuiButtonEmpty>
        );
      }

      // Error state - show retry
      if (item.status === 'error') {
        return (
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={() => handleRetry(item.id)}
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
        return (
          <EuiButtonEmpty
            size="xs"
            iconType="returnKey"
            onClick={() => handleUninstall(item.id)}
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
      return (
        <EuiButtonEmpty
          size="xs"
          iconType="download"
          onClick={() => handleInstall(item.id)}
          data-test-subj={`documentation-install-${item.id}`}
        >
          {i18n.ACTION_INSTALL}
        </EuiButtonEmpty>
      );
    },
    [handleInstall, handleUninstall, handleRetry, isInstalling, isUninstalling, refetch]
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
          {i18n.DOCUMENTATION_DESCRIPTION}
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
