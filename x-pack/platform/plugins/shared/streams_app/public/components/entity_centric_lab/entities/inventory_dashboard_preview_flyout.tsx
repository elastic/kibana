/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  useEntityDisplayName,
  useEntityFlyoutServices,
  type DashboardPreviewRequest,
} from '@kbn/entity-centric-lab-flyout';

export interface InventoryDashboardPreviewFlyoutProps {
  readonly preview: DashboardPreviewRequest;
  readonly entityName: string;
  readonly entityType?: string;
  readonly onBack: () => void;
  readonly onClose: () => void;
}

const InventoryDashboardPreviewBody = ({
  preview,
  entityName,
}: {
  readonly preview: DashboardPreviewRequest;
  readonly entityName: string;
}) => {
  const { renderTabDashboard } = useEntityFlyoutServices();

  const dashboardNode = useMemo(() => {
    if (!renderTabDashboard) {
      return null;
    }
    return renderTabDashboard(
      {
        savedObjectTitle: preview.dashboard.savedObjectTitle,
        scopeField: preview.dashboard.scopeField,
        savedObjectId: preview.dashboard.savedObjectId,
      },
      entityName
    );
  }, [renderTabDashboard, preview.dashboard, entityName]);

  if (!dashboardNode) {
    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        title={
          <h2>
            {i18n.translate(
              'xpack.streams.entityCentricLab.inventory.dashboardPreview.noRenderer.title',
              { defaultMessage: 'Dashboard preview unavailable' }
            )}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'xpack.streams.entityCentricLab.inventory.dashboardPreview.noRenderer.body',
                {
                  defaultMessage:
                    'The dashboard renderer is not available. Open the dashboard in a new tab instead.',
                }
              )}
            </p>
          </EuiText>
        }
      />
    );
  }

  return <>{dashboardNode}</>;
};

export const InventoryDashboardPreviewFlyout = ({
  preview,
  entityName,
  entityType,
  onBack,
  onClose,
}: InventoryDashboardPreviewFlyoutProps) => {
  const displayName = useEntityDisplayName(entityName, entityType);

  return (
    <EuiFlyoutResizable
      ownFocus={false}
      onClose={onClose}
      hideCloseButton
      size="l"
      data-test-subj="entityCentricLabInventoryDashboardPreview"
    >
      <EuiFlyoutHeader hasBorder css={css`padding-bottom: 0;`}>
        <EuiFlexGroup
          justifyContent="spaceBetween"
          alignItems="center"
          responsive={false}
          css={css`margin-bottom: -4px;`}
        >
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="editorUndo"
              size="xs"
              flush="left"
              color="text"
              onClick={onBack}
              data-test-subj="entityCentricLabInventoryDashboardPreviewBack"
            >
              {i18n.translate('xpack.streams.entityCentricLab.inventory.dashboardPreview.back', {
                defaultMessage: 'Back',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              size="xs"
              aria-label={i18n.translate(
                'xpack.streams.entityCentricLab.inventory.dashboardPreview.closeAriaLabel',
                { defaultMessage: 'Close' }
              )}
              color="text"
              display="empty"
              onClick={onClose}
              data-test-subj="entityCentricLabInventoryDashboardPreviewClose"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule
          margin="xs"
          css={css`margin-left: -24px; margin-right: -24px; width: auto;`}
        />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>{preview.title}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              iconType="popout"
              size="xs"
              href={preview.href}
              target="_blank"
              data-test-subj="entityCentricLabInventoryDashboardPreviewOpenNewTab"
            >
              {i18n.translate(
                'xpack.streams.entityCentricLab.inventory.dashboardPreview.viewInNewTab',
                { defaultMessage: 'View in new tab' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiBadge color="hollow" data-test-subj="entityCentricLabInventoryDashboardPreviewResourceBadge">
          {displayName}
        </EuiBadge>
        <EuiSpacer size="s" />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <InventoryDashboardPreviewBody preview={preview} entityName={entityName} />
      </EuiFlyoutBody>
    </EuiFlyoutResizable>
  );
};
