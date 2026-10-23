/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import moment from 'moment-timezone';
import {
  EuiBasicTable,
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSplitPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { toMountPoint } from '@kbn/react-kibana-mount';
import {
  useInstallProductDoc,
  useUninstallProductDoc,
  useDefaultInferenceId,
  REACT_QUERY_KEYS,
  type ProductDocBasePluginStart,
} from '@kbn/product-doc-base-plugin/public';
import { ResourceTypes } from '@kbn/product-doc-common';
import { useQueries, useQueryClient } from '@kbn/react-query';
import { useKibana } from '../../hooks/use_kibana';
import type { DocumentationItem, DocumentationStatus } from './types';
import { DOCUMENTATION_ITEMS_CONFIG, type NormalizedDocStatus } from './documentation_items';
import { useUpdateProductDoc } from './use_update_product_doc';
import * as i18n from './translations';

interface DocumentationSectionProps {
  productDocBase: ProductDocBasePluginStart;
}

export const DocumentationSection: React.FC<DocumentationSectionProps> = ({ productDocBase }) => {
  const { services } = useKibana();
  const { application, docLinks } = services;

  // Check if user has Agent Builder 'All' privileges (manageAgents capability)
  const hasManagePrivilege = application.capabilities.agentBuilder?.manageAgents === true;

  const queryClient = useQueryClient();

  const { inferenceId: productDocInferenceId, isLoading: isProductDocInferenceIdLoading } =
    useDefaultInferenceId(productDocBase, ResourceTypes.productDoc);
  const { inferenceId: securityLabsInferenceId, isLoading: isSecurityLabsInferenceIdLoading } =
    useDefaultInferenceId(productDocBase, ResourceTypes.securityLabs);

  const inferenceIdByResourceType = useMemo(
    () => ({
      [ResourceTypes.productDoc]: productDocInferenceId,
      [ResourceTypes.securityLabs]: securityLabsInferenceId,
      [ResourceTypes.openapiSpec]: productDocInferenceId,
    }),
    [productDocInferenceId, securityLabsInferenceId]
  );

  const isInferenceIdLoading = isProductDocInferenceIdLoading || isSecurityLabsInferenceIdLoading;

  const docsConfig = DOCUMENTATION_ITEMS_CONFIG;

  const statusQueries = useQueries({
    queries: docsConfig.map((doc) => {
      const resourceType = doc.resourceType;
      const inferenceId = inferenceIdByResourceType[resourceType];
      return {
        // IMPORTANT: use the shared product-doc-base query key so the existing install/uninstall hooks
        // invalidate these queries automatically (otherwise status only updates on full refresh).
        queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS, inferenceId, resourceType],
        queryFn: async () => {
          if (!inferenceId) {
            throw new Error('Inference ID is not available');
          }
          return doc.getNormalizedStatus({ productDocBase, inferenceId });
        },
        enabled: Boolean(inferenceId) && !isInferenceIdLoading,
        keepPreviousData: false,
        refetchOnWindowFocus: false,
        refetchInterval: (queryData?: NormalizedDocStatus) => {
          // Match useProductDocStatus behavior: poll when install/uninstall is in progress.
          const status = queryData?.status;

          return status === 'installing' || status === 'uninstalling' ? 2000 : false;
        },
      };
    }),
  });

  const isLoading = isInferenceIdLoading || statusQueries.some((q) => q.isLoading);

  const refetch = useCallback(() => {
    // Invalidate all doc status queries (for all rows) so they refresh together.
    queryClient.invalidateQueries({ queryKey: [REACT_QUERY_KEYS.GET_PRODUCT_DOC_STATUS] });
  }, [queryClient]);

  const documentationItems: DocumentationItem[] = useMemo(() => {
    return docsConfig.map((doc, idx) => {
      const data = statusQueries[idx]?.data;
      const status: DocumentationStatus = data?.status ?? 'uninstalled';
      const updateAvailable = doc.supportsUpdates ? Boolean(data?.updateAvailable) : false;

      return {
        id: doc.id,
        name: doc.name,
        status,
        resourceType: doc.resourceType,
        inferenceId: inferenceIdByResourceType[doc.resourceType],
        ...(updateAvailable ? { updateAvailable } : {}),
        ...(data?.availableArtifactLastModified
          ? { availableArtifactLastModified: data.availableArtifactLastModified }
          : {}),
        ...(data?.availableStackVersion
          ? { availableStackVersion: data.availableStackVersion }
          : {}),
        isTechPreview: doc.isTechPreview,
        isStubbed: doc.isStubbed,
        icon: doc.icon,
        ...(data?.failureReason ? { failureReason: data.failureReason } : {}),
        ...(data?.installedAt ? { installedAt: data.installedAt } : {}),
        ...(data?.artifactLastModified ? { artifactLastModified: data.artifactLastModified } : {}),
        ...(data?.installedStackVersion
          ? { installedStackVersion: data.installedStackVersion }
          : {}),
      };
    });
  }, [docsConfig, statusQueries, inferenceIdByResourceType]);

  const getActionButton = useCallback(
    (item: DocumentationItem) => {
      return (
        <DocumentationRowActions
          item={item}
          productDocBase={productDocBase}
          hasManagePrivilege={hasManagePrivilege}
          isInferenceIdLoading={isInferenceIdLoading}
          onRefetch={refetch}
        />
      );
    },
    [hasManagePrivilege, isInferenceIdLoading, productDocBase, refetch]
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
              <EuiIcon type={item.icon ?? 'documents'} aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="s">{name}</EuiText>
            </EuiFlexItem>
            <DocumentationVersionBadge item={item} />
            {item.updateAvailable && (
              <EuiFlexItem grow={false}>
                <EuiBadge
                  color="success"
                  data-test-subj={`documentation-update-available-${item.id}`}
                >
                  {i18n.UPDATE_AVAILABLE}
                </EuiBadge>
              </EuiFlexItem>
            )}
            {item.isTechPreview && (
              <EuiFlexItem grow={false}>
                <EuiBetaBadge label={i18n.TECH_PREVIEW} size="s" alignment="middle" />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'actions',
        name: i18n.COLUMN_ACTIONS,
        sortable: false,
        align: 'right',
        render: (_: unknown, item: DocumentationItem) => getActionButton(item),
      },
    ],
    [getActionButton]
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
          tableCaption={i18n.DOCUMENTATION_TABLE_CAPTION}
        />
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

/** Kibana advanced setting `dateFormat`, used when the UI setting is unavailable. */
const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';

/** Formats a timestamp with Kibana's `dateFormat` and `dateFormat:tz` settings. */
const UiSettingDate: React.FC<{ value: string }> = ({ value }) => {
  const { uiSettings } = useKibana().services;
  const dateFormatSetting = uiSettings.get('dateFormat');
  const dateFormat =
    typeof dateFormatSetting === 'string' && dateFormatSetting.length > 0
      ? dateFormatSetting
      : DEFAULT_DATE_FORMAT;
  const timeZoneSetting = uiSettings.get('dateFormat:tz');
  const timeZone =
    typeof timeZoneSetting === 'string' && timeZoneSetting.length > 0 ? timeZoneSetting : 'Browser';

  const formatted = useMemo(() => {
    const date = moment(value);
    if (!date.isValid()) {
      return value;
    }
    if (timeZone !== 'Browser') {
      return date.tz(timeZone).format(dateFormat);
    }
    return date.format(dateFormat);
  }, [dateFormat, timeZone, value]);

  return <>{formatted}</>;
};

const hasInstallDetails = (item: DocumentationItem): boolean =>
  (item.status === 'installed' || item.status === 'uninstalling') &&
  Boolean(
    item.installedStackVersion || item.artifactLastModified || item.installedAt || item.inferenceId
  );

/** Version string for the badge and the popover. Date-only artifacts use the zip day. */
const releaseVersionNode = (item: DocumentationItem): React.ReactNode => {
  if (item.installedStackVersion) {
    return item.installedStackVersion;
  }
  if (item.artifactLastModified) {
    return <UiSettingDate value={item.artifactLastModified} />;
  }
  return null;
};

const DetailValue: React.FC<{
  children: React.ReactNode;
  'data-test-subj': string;
  truncate?: boolean;
  tooltip?: string;
}> = ({ children, 'data-test-subj': dataTestSubj, truncate = false, tooltip }) => {
  const { euiTheme } = useEuiTheme();
  const value = (
    <span
      css={{
        display: truncate ? 'block' : 'inline',
        fontWeight: euiTheme.font.weight.bold,
        ...(truncate
          ? {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap' as const,
            }
          : {}),
      }}
    >
      {children}
    </span>
  );

  return (
    <EuiDescriptionListDescription data-test-subj={dataTestSubj}>
      {tooltip ? (
        <EuiToolTip content={tooltip} position="top">
          {value}
        </EuiToolTip>
      ) : (
        value
      )}
    </EuiDescriptionListDescription>
  );
};

const DocumentationDetails: React.FC<{ item: DocumentationItem }> = ({ item }) => {
  const version = releaseVersionNode(item);
  if (!version && !item.installedAt && !item.inferenceId) {
    return null;
  }

  return (
    <EuiDescriptionList
      type="column"
      compressed
      columnWidths={['6.5rem', '12rem']}
      data-test-subj={`documentation-details-${item.id}`}
    >
      {version ? (
        <>
          <EuiDescriptionListTitle>{i18n.DETAIL_VERSION}</EuiDescriptionListTitle>
          <DetailValue data-test-subj={`documentation-version-at-${item.id}`}>
            {version}
          </DetailValue>
        </>
      ) : null}
      {item.inferenceId ? (
        <>
          <EuiDescriptionListTitle>{i18n.DETAIL_INFERENCE}</EuiDescriptionListTitle>
          <DetailValue
            data-test-subj={`documentation-inference-model-${item.id}`}
            truncate
            tooltip={item.inferenceId}
          >
            {item.inferenceId}
          </DetailValue>
        </>
      ) : null}
      {item.installedAt ? (
        <>
          <EuiDescriptionListTitle>{i18n.DETAIL_INSTALLED}</EuiDescriptionListTitle>
          <DetailValue data-test-subj={`documentation-installed-at-${item.id}`}>
            <UiSettingDate value={item.installedAt} />
          </DetailValue>
        </>
      ) : null}
    </EuiDescriptionList>
  );
};

/** Version badge beside the doc name. Hover shows it is clickable; click opens the details popover. */
const DocumentationVersionBadge: React.FC<{ item: DocumentationItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const popoverTitleId = useGeneratedHtmlId();

  if (!hasInstallDetails(item)) {
    return null;
  }

  const version = releaseVersionNode(item);
  const badgeContent =
    version ?? (item.installedAt ? <UiSettingDate value={item.installedAt} /> : null);
  if (!badgeContent) {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        button={
          <EuiBadge
            color="hollow"
            iconType="info"
            onClick={() => setIsOpen((open) => !open)}
            onClickAriaLabel={i18n.VERSION_BADGE_ARIA_LABEL}
            data-test-subj={`documentation-version-badge-${item.id}`}
          >
            {badgeContent}
          </EuiBadge>
        }
        isOpen={isOpen}
        closePopover={closePopover}
        aria-labelledby={popoverTitleId}
        anchorPosition="downLeft"
        panelPaddingSize="m"
        panelStyle={{ width: 360 }}
        panelProps={{ 'data-test-subj': `documentation-version-popover-${item.id}` }}
      >
        <EuiPopoverTitle id={popoverTitleId}>{i18n.CURRENT_DOCUMENTATION}</EuiPopoverTitle>
        <DocumentationDetails item={item} />
      </EuiPopover>
    </EuiFlexItem>
  );
};

const DocumentationActionsMenu: React.FC<{
  itemId: string;
  isDisabled: boolean;
  onUninstall: () => void;
}> = ({ itemId, isDisabled, onUninstall }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const buttonLabel = isDisabled ? i18n.INSUFFICIENT_PRIVILEGES : i18n.ROW_ACTIONS_ARIA_LABEL;

  return (
    <EuiPopover
      button={
        <EuiToolTip content={buttonLabel} position="top" disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="ellipsis"
            aria-label={buttonLabel}
            color="text"
            size="xs"
            isDisabled={isDisabled}
            onClick={() => setIsOpen((open) => !open)}
            data-test-subj={`documentation-actions-${itemId}`}
          />
        </EuiToolTip>
      }
      isOpen={isOpen}
      closePopover={closePopover}
      anchorPosition="downRight"
      panelPaddingSize="none"
      aria-label={i18n.ROW_ACTIONS_ARIA_LABEL}
    >
      <EuiContextMenuPanel
        items={[
          <EuiContextMenuItem
            key="uninstall"
            icon="trash"
            color="danger"
            disabled={isDisabled}
            data-test-subj={`documentation-uninstall-${itemId}`}
            onClick={() => {
              closePopover();
              onUninstall();
            }}
          >
            {i18n.ACTION_UNINSTALL}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

const InstallUpdateControl: React.FC<{
  item: DocumentationItem;
  isDisabled: boolean;
  isLoading: boolean;
  onInstallUpdate: () => void;
}> = ({ item, isDisabled, isLoading, onInstallUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closePopover = useCallback(() => setIsOpen(false), []);
  const popoverTitleId = useGeneratedHtmlId();
  const hasVersion = Boolean(item.availableStackVersion);
  const hasDate = Boolean(item.availableArtifactLastModified);
  const updateButton = (
    <EuiButton
      color="success"
      fill
      size="s"
      iconType="download"
      isDisabled={isDisabled}
      isLoading={isLoading}
      onClick={() => setIsOpen((open) => !open)}
      data-test-subj={`documentation-install-update-${item.id}`}
    >
      {i18n.ACTION_INSTALL_UPDATE}
    </EuiButton>
  );

  return (
    <EuiPopover
      button={
        isDisabled ? (
          <EuiToolTip content={i18n.INSUFFICIENT_PRIVILEGES} position="top">
            {updateButton}
          </EuiToolTip>
        ) : (
          updateButton
        )
      }
      isOpen={isOpen}
      closePopover={closePopover}
      aria-labelledby={popoverTitleId}
      anchorPosition="downRight"
      panelPaddingSize="m"
      panelStyle={{ width: 420 }}
      panelProps={{ 'data-test-subj': `documentation-update-popover-${item.id}` }}
    >
      <EuiPopoverTitle id={popoverTitleId}>{i18n.NEW_VERSION}</EuiPopoverTitle>
      {hasVersion || hasDate ? (
        <EuiDescriptionList type="column" compressed columnWidths={['6.5rem', '16rem']}>
          {hasVersion ? (
            <>
              <EuiDescriptionListTitle>{i18n.DETAIL_VERSION}</EuiDescriptionListTitle>
              <DetailValue data-test-subj={`documentation-update-version-${item.id}`}>
                {item.availableStackVersion}
              </DetailValue>
            </>
          ) : null}
          {hasDate && item.availableArtifactLastModified ? (
            <>
              <EuiDescriptionListTitle>
                {hasVersion ? i18n.DETAIL_DATE : i18n.DETAIL_VERSION}
              </EuiDescriptionListTitle>
              <DetailValue data-test-subj={`documentation-update-date-${item.id}`}>
                <UiSettingDate value={item.availableArtifactLastModified} />
              </DetailValue>
            </>
          ) : null}
        </EuiDescriptionList>
      ) : null}
      <EuiPopoverFooter paddingSize="s">
        <EuiButton
          color="success"
          fullWidth
          size="s"
          iconType="download"
          isDisabled={isDisabled}
          isLoading={isLoading}
          data-test-subj={`documentation-update-${item.id}`}
          onClick={() => {
            closePopover();
            onInstallUpdate();
          }}
        >
          {i18n.ACTION_INSTALL_UPDATE}
        </EuiButton>
      </EuiPopoverFooter>
    </EuiPopover>
  );
};

const UPDATE_STATUS_POLL_MS = 2000;
// Failed updates that happen before replacement leave the installed status untouched, so give up waiting.
const UPDATE_STATUS_TIMEOUT_MS = 10 * 60 * 1000;

const DocumentationRowActions: React.FC<{
  item: DocumentationItem;
  productDocBase: ProductDocBasePluginStart;
  hasManagePrivilege: boolean;
  isInferenceIdLoading: boolean;
  onRefetch: () => void;
}> = ({ item, productDocBase, hasManagePrivilege, isInferenceIdLoading, onRefetch }) => {
  const { services } = useKibana();
  const { notifications, rendering, docLinks } = services;
  const [isUpdating, setIsUpdating] = useState(false);
  const isUpdatingRef = useRef(false);
  const sawInstallingRef = useRef(false);
  const baselineRef = useRef<{
    installedAt?: string;
    artifactLastModified?: string;
    updateAvailable?: boolean;
  } | null>(null);

  const installMutation = useInstallProductDoc(productDocBase, {
    onSuccess: () => {
      notifications.toasts.addSuccess({ title: i18n.getInstallSuccessTitle(item.name) });
    },
    onError: (error) => {
      const message = error.body?.message ?? error.message;
      notifications.toasts.addDanger({
        title: i18n.getInstallErrorTitle(item.name),
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

  const updateMutation = useUpdateProductDoc(productDocBase, {
    onError: (error) => {
      isUpdatingRef.current = false;
      sawInstallingRef.current = false;
      baselineRef.current = null;
      setIsUpdating(false);
      const message = error.body?.message ?? error.message;
      notifications.toasts.addDanger({
        title: i18n.getUpdateErrorTitle(item.name),
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

  const uninstallMutation = useUninstallProductDoc(productDocBase, {
    onSuccess: () => {
      notifications.toasts.addSuccess({ title: i18n.getUninstallSuccessTitle(item.name) });
    },
    onError: (error) => {
      notifications.toasts.addError(new Error(error.body?.message ?? error.message), {
        title: i18n.getUninstallErrorTitle(item.name),
      });
    },
  });

  const installVars = useMemo(
    () => ({
      inferenceId: item.inferenceId,
      resourceType: item.resourceType,
    }),
    [item.inferenceId, item.resourceType]
  );

  const isProductDoc = item.resourceType === ResourceTypes.productDoc;
  const isItemInstalling =
    item.status === 'installing' || installMutation.isLoading || updateMutation.isLoading;
  const isItemUninstalling = item.status === 'uninstalling' || uninstallMutation.isLoading;
  const isActionDisabled = !hasManagePrivilege || isInferenceIdLoading;

  useEffect(() => {
    if (!isUpdating) {
      return;
    }
    const timer = window.setInterval(() => {
      onRefetch();
    }, UPDATE_STATUS_POLL_MS);
    const timeout = window.setTimeout(() => {
      isUpdatingRef.current = false;
      sawInstallingRef.current = false;
      baselineRef.current = null;
      setIsUpdating(false);
      notifications.toasts.addDanger({ title: i18n.getUpdateErrorTitle(item.name) });
    }, UPDATE_STATUS_TIMEOUT_MS);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(timeout);
    };
  }, [isUpdating, onRefetch, notifications, item.name]);

  useEffect(() => {
    if (!isUpdating || !isUpdatingRef.current) {
      return;
    }
    if (item.status === 'installing') {
      sawInstallingRef.current = true;
      return;
    }
    const baseline = baselineRef.current;
    const releaseChanged =
      baseline != null &&
      (item.installedAt !== baseline.installedAt ||
        item.artifactLastModified !== baseline.artifactLastModified ||
        Boolean(item.updateAvailable) !== Boolean(baseline.updateAvailable));
    const finished =
      item.status === 'error' ||
      ((item.status === 'installed' || item.status === 'uninstalled') &&
        (sawInstallingRef.current || releaseChanged));
    if (!finished) {
      return;
    }
    isUpdatingRef.current = false;
    sawInstallingRef.current = false;
    baselineRef.current = null;
    setIsUpdating(false);
    if (item.status === 'installed') {
      notifications.toasts.addSuccess({ title: i18n.getUpdateSuccessTitle(item.name) });
    }
  }, [isUpdating, item, notifications]);

  const onUpdate = () => {
    if (isProductDoc) {
      notifications.toasts.addInfo({ title: i18n.UPDATING_TO_NEWEST_VERSION });
      baselineRef.current = {
        installedAt: item.installedAt,
        artifactLastModified: item.artifactLastModified,
        updateAvailable: item.updateAvailable,
      };
      sawInstallingRef.current = false;
      isUpdatingRef.current = true;
      setIsUpdating(true);
      updateMutation.mutate({ inferenceId: item.inferenceId });
      return;
    }
    installMutation.mutate(installVars);
  };

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
      <EuiButton
        color="text"
        size="s"
        iconType="download"
        isDisabled={true}
        data-test-subj={`documentation-install-${item.id}`}
      >
        {i18n.ACTION_INSTALL}
      </EuiButton>
    );
  }

  // Not available - show retry
  if (item.status === 'not_available') {
    return wrapWithPrivilegeTooltip(
      <EuiButtonEmpty
        size="xs"
        iconType="refresh"
        onClick={hasManagePrivilege ? () => onRefetch() : undefined}
        isDisabled={!hasManagePrivilege}
        data-test-subj={`documentation-retry-${item.id}`}
      >
        {i18n.ACTION_RETRY}
      </EuiButtonEmpty>
    );
  }

  // Error state - show the failure next to retry now that the Status column is gone
  if (item.status === 'error') {
    const suggestion = item.failureReason?.includes('model_deployment_timeout_exception')
      ? i18n.getModelDeploymentTimeoutSuggestion(item.inferenceId ?? '')
      : null;
    return wrapWithPrivilegeTooltip(
      <EuiFlexGroup direction="column" alignItems="flexEnd" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          {item.failureReason ? (
            <EuiText size="xs" color="subdued">
              {item.failureReason}
            </EuiText>
          ) : (
            <EuiBadge color="danger">{i18n.STATUS_ERROR}</EuiBadge>
          )}
        </EuiFlexItem>
        {suggestion ? (
          <EuiFlexItem grow={false}>
            <EuiText size="xs">{suggestion}</EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="xs"
            iconType="refresh"
            onClick={isActionDisabled ? undefined : () => installMutation.mutate(installVars)}
            isDisabled={isActionDisabled}
            data-test-subj={`documentation-retry-${item.id}`}
          >
            {i18n.ACTION_RETRY}
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  // Uninstalling - show loading state
  if (isItemUninstalling) {
    return (
      <EuiButton
        size="s"
        isLoading={true}
        isDisabled={true}
        data-test-subj={`documentation-uninstalling-${item.id}`}
      >
        {i18n.STATUS_UNINSTALLING}
      </EuiButton>
    );
  }

  // Update schedules a background install. Keep this control until that install finishes,
  // including the gap before status flips to `installing`.
  if (isUpdating) {
    return (
      <EuiButton
        size="s"
        isLoading={true}
        isDisabled={true}
        data-test-subj={`documentation-updating-${item.id}`}
        data-status={item.status}
      >
        {i18n.STATUS_UPDATING}
      </EuiButton>
    );
  }

  // Installed: badge plus an overflow menu for uninstall.
  // A newer release replaces the badge with Install update, which opens the new-version popover.
  if (item.status === 'installed') {
    const actionsMenu = (
      <DocumentationActionsMenu
        itemId={item.id}
        isDisabled={isActionDisabled}
        onUninstall={() => uninstallMutation.mutate(installVars)}
      />
    );
    const actions = (
      <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
        <EuiFlexItem grow={false}>
          {item.updateAvailable ? (
            <InstallUpdateControl
              item={item}
              isDisabled={isActionDisabled}
              isLoading={isProductDoc ? updateMutation.isLoading : installMutation.isLoading}
              onInstallUpdate={onUpdate}
            />
          ) : (
            <EuiBadge iconType="check" data-test-subj={`documentation-installed-badge-${item.id}`}>
              {i18n.STATUS_INSTALLED}
            </EuiBadge>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{actionsMenu}</EuiFlexItem>
      </EuiFlexGroup>
    );

    return actions;
  }

  // Installing - show loading state
  if (isItemInstalling) {
    return (
      <EuiButton
        size="s"
        isLoading={true}
        isDisabled={true}
        data-test-subj={`documentation-installing-${item.id}`}
      >
        {i18n.STATUS_INSTALLING}
      </EuiButton>
    );
  }

  // Default - show install button
  return wrapWithPrivilegeTooltip(
    <EuiButton
      color="text"
      size="s"
      iconType="download"
      onClick={isActionDisabled ? undefined : () => installMutation.mutate(installVars)}
      isDisabled={isActionDisabled}
      data-test-subj={`documentation-install-${item.id}`}
    >
      {i18n.ACTION_INSTALL}
    </EuiButton>
  );
};
