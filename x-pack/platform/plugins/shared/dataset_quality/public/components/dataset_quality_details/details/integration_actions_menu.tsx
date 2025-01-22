/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiPopover,
  EuiSkeletonRectangle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { RouterLinkProps } from '@kbn/router-utils/src/get_router_link_props';
import { Integration } from '../../../../common/data_streams_stats/integration';
import { Dashboard } from '../../../../common/api_types';
import { useDatasetQualityDetailsState, useIntegrationActions } from '../../../hooks';

const integrationActionsText = i18n.translate(
  'xpack.datasetQuality.details.integrationActionsText',
  {
    defaultMessage: 'Integration actions',
  }
);

const seeIntegrationText = i18n.translate('xpack.datasetQuality.details.seeIntegrationActionText', {
  defaultMessage: 'See integration',
});

const indexTemplateText = i18n.translate('xpack.datasetQuality.details.indexTemplateActionText', {
  defaultMessage: 'Index template',
});

const viewDashboardsText = i18n.translate('xpack.datasetQuality.details.viewDashboardsActionText', {
  defaultMessage: 'View dashboards',
});

export function IntegrationActionsMenu({
  integration,
  dashboards,
  dashboardsLoading,
}: {
  integration: Integration;
  dashboards?: Dashboard[];
  dashboardsLoading: boolean;
}) {
  const { canUserAccessDashboards, canUserViewIntegrations, datasetDetails } =
    useDatasetQualityDetailsState();
  const { version, name: integrationName } = integration;
  const { type, name } = datasetDetails;
  const {
    isOpen,
    handleCloseMenu,
    handleToggleMenu,
    getIntegrationOverviewLinkProps,
    getIndexManagementLinkProps,
    getDashboardLinkProps,
  } = useIntegrationActions();

  const actionButton = (
    <EuiButtonIcon
      title={integrationActionsText}
      aria-label={integrationActionsText}
      iconType="boxesHorizontal"
      onClick={handleToggleMenu}
      data-test-subj="datasetQualityDetailsIntegrationActionsButton"
    />
  );

  const MenuActionItem = ({
    dataTestSubject,
    buttonText,
    routerLinkProps,
    iconType,
    disabled = false,
  }: {
    dataTestSubject: string;
    buttonText: string | React.ReactNode;
    routerLinkProps: RouterLinkProps;
    iconType: string;
    disabled?: boolean;
  }) => (
    <EuiButtonEmpty
      {...routerLinkProps}
      size="s"
      css={css`
        font-weight: normal;
      `}
      color="text"
      iconType={iconType}
      data-test-subj={dataTestSubject}
      disabled={disabled}
    >
      {buttonText}
    </EuiButtonEmpty>
  );

  const panelItems = useMemo(() => {
    const firstLevelItems: EuiContextMenuPanelItemDescriptor[] = [
      ...(canUserViewIntegrations
        ? [
            {
              renderItem: () => (
                <MenuActionItem
                  buttonText={seeIntegrationText}
                  dataTestSubject="datasetQualityDetailsIntegrationActionOverview"
                  routerLinkProps={getIntegrationOverviewLinkProps(integrationName, version)}
                  iconType="package"
                  disabled={!canUserViewIntegrations}
                />
              ),
            },
          ]
        : []),
      {
        renderItem: () => (
          <MenuActionItem
            buttonText={indexTemplateText}
            dataTestSubject="datasetQualityDetailsIntegrationActionTemplate"
            routerLinkProps={getIndexManagementLinkProps({
              sectionId: 'data',
              appId: `index_management/templates/${type}-${name}`,
            })}
            iconType="indexPatternApp"
          />
        ),
      },
      {
        isSeparator: true,
        key: 'sep',
      },
    ];

    if (dashboards?.length && canUserAccessDashboards) {
      firstLevelItems.push({
        icon: 'dashboardApp',
        panel: 1,
        name: viewDashboardsText,
        'data-test-subj': 'datasetQualityDetailsIntegrationActionViewDashboards',
        disabled: false,
      });
    } else if (dashboardsLoading) {
      firstLevelItems.push({
        icon: 'dashboardApp',
        name: <EuiSkeletonRectangle width={120} title={viewDashboardsText} />,
        'data-test-subj': 'datasetQualityDetailsIntegrationActionDashboardsLoading',
        disabled: true,
      });
    }

    const panel: EuiContextMenuPanelDescriptor[] = [
      {
        id: 0,
        items: firstLevelItems,
      },
      {
        id: 1,
        title: viewDashboardsText,
        items: dashboards?.map((dashboard) => {
          return {
            renderItem: () => (
              <MenuActionItem
                buttonText={dashboard.title}
                dataTestSubject="datasetQualityDetailsIntegrationActionDashboard"
                routerLinkProps={getDashboardLinkProps(dashboard)}
                iconType="dashboardApp"
              />
            ),
          };
        }),
      },
    ];

    return panel;
  }, [
    dashboards,
    getDashboardLinkProps,
    getIndexManagementLinkProps,
    getIntegrationOverviewLinkProps,
    integrationName,
    name,
    type,
    version,
    dashboardsLoading,
    canUserAccessDashboards,
    canUserViewIntegrations,
  ]);

  return (
    <EuiPopover
      anchorPosition="downRight"
      panelPaddingSize="none"
      button={actionButton}
      isOpen={isOpen}
      closePopover={handleCloseMenu}
    >
      <EuiContextMenu size="s" panels={panelItems} initialPanelId={0} />
    </EuiPopover>
  );
}
