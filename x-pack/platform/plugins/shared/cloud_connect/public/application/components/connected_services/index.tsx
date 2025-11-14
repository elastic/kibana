/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
  EuiConfirmModal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCloudConnectedAppContext } from '../../app_context';
import { OverviewSection } from './overview_section';
import { ServicesSection } from './services_section';
import { MigrationSection } from './migration_section';

interface ClusterDetails {
  id: string;
  name: string;
  metadata: {
    created_at: string;
    created_by: string;
    organization_id: string;
  };
  self_managed_cluster: {
    id: string;
    name: string;
    version: string;
  };
  license: {
    type: string;
    uid: string;
  };
  services: {
    auto_ops?: {
      enabled: boolean;
      supported: boolean;
      config?: { region_id?: string };
    };
    eis?: {
      enabled: boolean;
      supported: boolean;
      config?: { region_id?: string };
    };
  };
}

export interface ConnectedServicesPageProps {
  clusterDetails: ClusterDetails;
}

export const ConnectedServicesPage: React.FC<ConnectedServicesPageProps> = ({ clusterDetails }) => {
  const { euiTheme } = useEuiTheme();
  const { http, notifications } = useCloudConnectedAppContext();
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isDisconnectModalVisible, setIsDisconnectModalVisible] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

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
    try {
      await http.delete('/internal/cloud_connect/cluster');

      notifications.toasts.addSuccess({
        title: (
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.disconnect.successTitle"
            defaultMessage="Cluster disconnected successfully"
          />
        ),
        text: (
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.disconnect.successMessage"
            defaultMessage="Your cluster has been disconnected from Cloud Connect."
          />
        ),
      });

      closeDisconnectModal();

      // Reload the page to show onboarding view
      window.location.reload();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: (
          <FormattedMessage
            id="xpack.cloudConnect.connectedServices.disconnect.errorTitle"
            defaultMessage="Failed to disconnect cluster"
          />
        ),
      });
      setIsDisconnecting(false);
    }
  };

  const actionsMenuItems = [
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
    <EuiConfirmModal
      title={
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.disconnect.modalTitle"
          defaultMessage="Disconnect cluster?"
        />
      }
      onCancel={closeDisconnectModal}
      onConfirm={handleDisconnectCluster}
      cancelButtonText={
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.disconnect.cancelButton"
          defaultMessage="Cancel"
        />
      }
      confirmButtonText={
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.disconnect.confirmButton"
          defaultMessage="Disconnect"
        />
      }
      buttonColor="danger"
      defaultFocusedButton="cancel"
      confirmButtonDisabled={isDisconnecting}
      isLoading={isDisconnecting}
    >
      <p>
        <FormattedMessage
          id="xpack.cloudConnect.connectedServices.disconnect.modalDescription"
          defaultMessage="This will remove the connection to Cloud Connect. You can reconnect at any time by providing an API key."
        />
      </p>
    </EuiConfirmModal>
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
          <EuiText size="s">
            <FormattedMessage
              id="xpack.cloudConnect.connectedServices.pageDescription"
              defaultMessage="This cluster is connected to a Cloud Organization. {learnMore}"
              values={{
                learnMore: (
                  <EuiLink
                    href="https://www.elastic.co/guide/en/cloud/current/ec-cloud-connect.html"
                    target="_blank"
                    external
                  >
                    <FormattedMessage
                      id="xpack.cloudConnect.connectedServices.learnMore"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        }
        rightSideItems={[
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
        ]}
      />
      <EuiSpacer size="l" />

      <EuiPageBody>
        <OverviewSection
          organizationId={clusterDetails.metadata.organization_id}
          connectedAt={clusterDetails.metadata.created_at}
        />

        <EuiSpacer size="xxl" />

        <ServicesSection services={clusterDetails.services} />

        <MigrationSection />
      </EuiPageBody>

      {disconnectModal}
    </EuiPage>
  );
};
