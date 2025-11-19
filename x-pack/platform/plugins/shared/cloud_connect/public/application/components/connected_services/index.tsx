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
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useCloudConnectedAppContext } from '../../app_context';
import { OverviewSection } from './overview_section';
import { ServicesSection } from './services_section';
import { MigrationSection } from './migration_section';
import { DisconnectClusterModal } from './disconnect_cluster_modal';

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
  onRefetch: () => Promise<void>;
}

export const ConnectedServicesPage: React.FC<ConnectedServicesPageProps> = ({
  clusterDetails,
  onRefetch,
}) => {
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
        title: i18n.translate(
          'xpack.cloudConnect.connectedServices.disconnect.successTitle',
          {
            defaultMessage: 'Cluster disconnected successfully'
          }
        ),
        text: i18n.translate(
          'xpack.cloudConnect.connectedServices.disconnect.successMessage',
          {
            defaultMessage: 'Your cluster has been disconnected from Cloud Connect.'
          }
        ),
      });

      closeDisconnectModal();

      // Reload the page to show onboarding view
      window.location.reload();
    } catch (error) {
      notifications.toasts.addError(error as Error, {
        title: i18n.translate(
          'xpack.cloudConnect.connectedServices.disconnect.errorTitle',
          {
            defaultMessage: 'Failed to disconnect cluster'
          }
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

        <ServicesSection services={clusterDetails.services} onRefetch={onRefetch} />

        <MigrationSection />
      </EuiPageBody>

      {disconnectModal}
    </EuiPage>
  );
};

/*

the cluster details api response is like this:
{"id":"b59d7d12daa44e08ba0665c8f140b29d","license":{"type":"trial","uid":"fdc52385-1b15-4bc9-b39f-249ddd3d34b8"},"metadata":{"created_at":"2025-11-14T10:22:51.709885494Z","created_by":"1974340327","organization_id":"92149198"},"name":"c0c72560-8e51-49a8-a555-94076d718320","self_managed_cluster":{"id":"I5yxbA3dTFe-aJA78PSvEw","name":"c0c72560-8e51-49a8-a555-94076d718320","version":"9.3.0-SNAPSHOT"},"services":{"auto_ops":{"enabled":false,"support":{"minimum_stack_version":"7.17.0","supported":true,"valid_license_types":["trial","enterprise"]}},"eis":{"enabled":false,"support":{"minimum_stack_version":"9.3.0","supported":false,"valid_license_types":["trial","basic","dev","silver","gold","platinum","enterprise"]}}}}


There are a few things we need to make sure of when rendering the serivices cards:

* if we ever encounter a service that has support.supported=false, we should hide mark it as isCardDisabled: true in services_section/index.tsx and the badge should say Unsupported and have a tooltip that says "This service is not supported with the current cluster configuration."
* Syntethics service should be hardcoded as it is right now given that is not yet returned by the API, but we want to tell the users that it will be there soon.
* If a service is not enabled (enabled: false), the connect button should call a server api that allows us to edit the service:
  * The route should be PUT cloud_connect/cluster_details in our server side and should internally call PATCH /api/v1/cloud-connected/clusters/{id} in cloud.
  * Should send the service to be enabled in the body, e.g. { services: { eis: { enabled: true } } }
  * When a service is enabled, the disconnect button should call the same api but with enabled: false
  * When disabling a service, we should show a confirmation modal before proceeding.
  * When a service is enabled:
  * the main action button should be just a link to the service dashboard in cloud, we can hardcode this to https://cloud.elastic.co/deployments for now.
  * The more actions button should have a disable action instead.
* Currently we hardcode the description for each service, we isntead should create a mapping object that holds the service key and an object with title and documentation url. The title should be internationalized and the url can be hardcoded eto https://elastic.co/docs/test for now

*/
