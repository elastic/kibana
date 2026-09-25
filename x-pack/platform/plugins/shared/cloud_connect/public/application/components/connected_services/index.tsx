/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPage, EuiSpacer } from '@elastic/eui';
import { AppHeader, type AppHeaderMenu } from '@kbn/app-header';
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
  const {
    notifications,
    hasConfigurePermission,
    docLinks,
    apiService,
    licensing,
  } = useCloudConnectedAppContext();
  const [isDisconnectModalVisible, setIsDisconnectModalVisible] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRotatingApiKey, setIsRotatingApiKey] = useState(false);

  const localLicense = useObservable(licensing.license$);
  const currentLicenseType = localLicense?.type;

  const showDisconnectModal = useCallback(() => {
    setIsDisconnectModalVisible(true);
  }, []);

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

  const handleRotateApiKey = useCallback(async () => {
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
  }, [apiService, notifications.toasts]);

  const menu = useMemo<AppHeaderMenu | undefined>(() => {
    if (!hasConfigurePermission) {
      return undefined;
    }

    return {
      items: [
        {
          id: 'rotateApiKey',
          label: i18n.translate('xpack.cloudConnect.connectedServices.actions.rotateApiKey', {
            defaultMessage: 'Rotate API key',
          }),
          iconType: 'key',
          overflow: true,
          isLoading: isRotatingApiKey,
          disableButton: isRotatingApiKey,
          run: () => {
            void handleRotateApiKey();
          },
          testId: 'cloudConnectRotateApiKeyButton',
        },
        {
          id: 'disconnectCluster',
          label: i18n.translate('xpack.cloudConnect.connectedServices.actions.disconnectCluster', {
            defaultMessage: 'Disconnect cluster',
          }),
          iconType: 'unlink',
          overflow: true,
          isDestructive: true,
          run: showDisconnectModal,
          testId: 'cloudConnectDisconnectClusterButton',
        },
      ],
    };
  }, [handleRotateApiKey, hasConfigurePermission, isRotatingApiKey, showDisconnectModal]);

  const disconnectModal = isDisconnectModalVisible ? (
    <DisconnectClusterModal
      clusterName={clusterDetails.name}
      onClose={closeDisconnectModal}
      onConfirm={handleDisconnectCluster}
      isLoading={isDisconnecting}
    />
  ) : null;

  return (
    <EuiPage direction="column" grow={false} paddingSize="m">
      <AppHeader
        title={i18n.translate('xpack.cloudConnect.connectedServices.pageTitle', {
          defaultMessage: 'Cloud connected services',
        })}
        description={i18n.translate('xpack.cloudConnect.connectedServices.pageDescription', {
          defaultMessage: 'This cluster is connected to an Elastic Cloud organization.',
        })}
        menu={menu}
        docLink={docLinks.links.cloud.cloudConnect}
        spacing="bleed"
      />
      <EuiPage direction="column" grow={false} paddingSize="none" restrictWidth={true}>
        <EuiSpacer size="l" />
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
      </EuiPage>
      {disconnectModal}
    </EuiPage>
  );
};
