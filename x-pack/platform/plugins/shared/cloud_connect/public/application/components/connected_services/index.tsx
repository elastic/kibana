/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiPage,
  EuiPageHeader,
  EuiPageBody,
  useEuiTheme,
  EuiText,
  EuiLink,
  EuiSpacer,
  EuiButton,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import useObservable from 'react-use/lib/useObservable';
import { useCloudConnectedAppContext } from '../../app_context';
import { OverviewSection } from './overview_section';
import { ServicesSection } from './services_section';
import { MigrationSection } from './migration_section';
import { DisconnectClusterModal } from './disconnect_cluster_modal';
import type { ClusterDetails, ServiceType } from '../../../types';

export { useClusterConnection } from './use_cluster_connection';

export interface ConnectedServicesPageProps {
  clusterDetails: ClusterDetails;
  onServiceUpdate: (serviceKey: ServiceType, enabled: boolean) => void;
  onDisconnect: () => void;
}

export const ConnectedServicesPage: React.FC<ConnectedServicesPageProps> = ({
  clusterDetails,
  onServiceUpdate,
  onDisconnect,
}) => {
  const { euiTheme } = useEuiTheme();
  const {
    notifications,
    hasConfigurePermission,
    docLinks,
    telemetryService,
    apiService,
    licensing,
  } = useCloudConnectedAppContext();
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDisconnectModalVisible, setIsDisconnectModalVisible] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRotatingApiKey, setIsRotatingApiKey] = useState(false);

  const localLicense = useObservable(licensing.license$);
  const currentLicenseType = localLicense?.type;

  const closeActionsPopover = () => setIsActionsPopoverOpen(false);
  const toggleActionsPopover = () => setIsActionsPopoverOpen(!isActionsPopoverOpen);

  const showDisconnectModal = () => {
    closeActionsPopover();
    setIsDisconnectModalVisible(true);
  };

  const closeDisconnectModal = () => {
    setIsDisconnectModalVisible(false);
  };

  const handleDisconnectCluster = async () => {
    setIsDisconnecting(true);

    const { error } = await apiService.disconnectCluster();

    if (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.cloudConnect.connectedServices.disconnect.errorTitle', {
          defaultMessage: 'Failed to disconnect cluster',
        }),
        text: error.message,
      });
      setIsDisconnecting(false);
      return;
    }

    notifications.toasts.addSuccess({
      title: i18n.translate('xpack.cloudConnect.connectedServices.disconnect.successTitle', {
        defaultMessage: 'Cluster disconnected successfully',
      }),
      text: i18n.translate('xpack.cloudConnect.connectedServices.disconnect.successMessage', {
        defaultMessage: 'Your cluster has been disconnected from Cloud Connect.',
      }),
    });

    closeDisconnectModal();

    // Clear cluster details to immediately show onboarding view
    onDisconnect();
  };

  const handleRotateApiKey = async () => {
    closeActionsPopover();
    setIsRotatingApiKey(true);

    const { error } = await apiService.rotateApiKey();

    setIsRotatingApiKey(false);

    if (error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.cloudConnect.rotateApiKey.errorTitle', {
          defaultMessage: 'Failed to rotate API key',
        }),
        text: error.message,
      });
      return;
    }

    notifications.toasts.addSuccess({
      title: i18n.translate('xpack.cloudConnect.rotateApiKey.successTitle', {
        defaultMessage: 'API key rotated successfully',
      }),
    });
  };

  const actionsMenuItems = [
    <EuiContextMenuItem key="rotate" onClick={handleRotateApiKey} disabled={isRotatingApiKey}>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiText size="s">
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.actions.rotateApiKey"
              defaultMessage="Rotate API key"
            />
          </EuiText>
        </EuiFlexItem>
        {isRotatingApiKey && (
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiContextMenuItem>,
    <EuiContextMenuItem key="disconnect" onClick={showDisconnectModal}>
      <EuiText color="danger" size="s">
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.actions.disconnectCluster"
          defaultMessage="Disconnect cluster"
        />
      </EuiText>
    </EuiContextMenuItem>,
  ];

  const disconnectModal = isDisconnectModalVisible ? (
    <DisconnectClusterModal
      clusterName={clusterDetails.name}
      onClose={closeDisconnectModal}
      onConfirm={handleDisconnectCluster}
      isLoading={isDisconnecting}
    />
  ) : null;

  const actionsButton = (
    <EuiButton fill iconType="arrowDown" iconSide="right" onClick={toggleActionsPopover}>
      <FormattedMessage
        id="xpack.cloudConnect.connectedServices.actionsButton"
        defaultMessage="Actions"
      />
    </EuiButton>
  );

  return (
    <EuiPage
      direction="column"
      restrictWidth={1200}
      grow={false}
      css={{ background: euiTheme.colors.backgroundBasePlain }}
      paddingSize="l"
    >
      <EuiPageHeader
        pageTitle={
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.pageTitle"
            defaultMessage="Cloud connected services"
          />
        }
        bottomBorder
        description={
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.pageDescription"
            defaultMessage="This cluster is connected to an Elastic Cloud organization. {learnMore}"
            values={{
              learnMore: (
                <EuiLink
                  href={docLinks.links.cloud.cloudConnect}
                  target="_blank"
                  external
                  onMouseDown={() => {
                    // Track telemetry for learn more documentation link.
                    // We intentionally avoid `onClick` to keep `href` (open-in-new-tab) without violating lint rules.
                    telemetryService.trackLinkClicked({ destination_type: 'cloud_connect_docs' });
                  }}
                >
                  <FormattedMessage
                    id="xpack.cloudConnect.connectedServices.learnMore"
                    defaultMessage="Learn more"
                  />
                </EuiLink>
              ),
            }}
          />
        }
        rightSideItems={
          hasConfigurePermission
            ? [
                <EuiPopover
                  key="actions"
                  button={actionsButton}
                  isOpen={isActionsPopoverOpen}
                  closePopover={closeActionsPopover}
                  panelPaddingSize="none"
                  anchorPosition="downRight"
                >
                  <EuiContextMenuPanel items={actionsMenuItems} />
                </EuiPopover>,
              ]
            : []
        }
      />
      <EuiSpacer size="l" />

      <EuiPageBody>
        <OverviewSection
          organizationId={clusterDetails.metadata.organization_id}
          connectedAt={clusterDetails.metadata.created_at}
          subscription={clusterDetails.metadata.subscription}
        />

        <EuiSpacer size="xxl" />

        <ServicesSection
          services={clusterDetails.services}
          onServiceUpdate={onServiceUpdate}
          subscription={clusterDetails.metadata.subscription}
          currentLicenseType={currentLicenseType}
        />

        <MigrationSection />
      </EuiPageBody>

      {disconnectModal}
    </EuiPage>
  );
};
