/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiConfirmModal, EuiSpacer } from '@elastic/eui';
import { KibanaSavedObjectType } from '@kbn/fleet-plugin/public';
import { MonitoringStartServices } from '../../../types';

const INGEST_PIPELINE_DASHBOARD_ID = 'elasticsearch-metrics-ingest-pipelines';

/**
 * If the ingest pipeline dashboard is installed, navigate to it. Otherwise, prompt the user to install the package
 * first, then navigate. If user does not have permission to install packages, show a message.
 * @param services
 * @returns
 */
export const ingestPipelineTabOnClick = async (services: MonitoringStartServices) => {
  const response = await services.fleet?.hooks.epm.getBulkAssets({
    assetIds: [
      {
        id: INGEST_PIPELINE_DASHBOARD_ID,
        type: 'dashboard' as KibanaSavedObjectType,
      },
    ],
  });
  const dashboardFound =
    response?.data?.items?.length &&
    response.data.items.some((item) => item.id === INGEST_PIPELINE_DASHBOARD_ID);

  const navigateToDashboard = () =>
    services.dashboard!.locator!.navigate({
      dashboardId: INGEST_PIPELINE_DASHBOARD_ID,
    });

  if (!dashboardFound) {
    const installPackage = () =>
      services.http!.post('/api/fleet/epm/packages/elasticsearch', {
        headers: { 'Elastic-Api-Version': '2023-10-31' },
      });

    const ref = services.overlays!.openModal(
      toMountPoint(
        <IngestPipelineModal
          installPackage={installPackage}
          navigateToDashboard={navigateToDashboard}
          canInstallPackages={!!services.fleet?.authz.integrations.installPackages}
          closeModal={() => ref.close()}
        />,
        services
      )
    );

    return await ref.onClose;
  } else {
    return navigateToDashboard();
  }
};

/**
 * Modal to prompt the user to either install the Elasticsearch integration or contact an admin.
 */
export const IngestPipelineModal = ({
  canInstallPackages,
  closeModal,
  installPackage,
  navigateToDashboard,
}: {
  closeModal: () => void;
  canInstallPackages: boolean;
  installPackage: () => Promise<unknown>;
  navigateToDashboard: () => void;
}) => {
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string>();

  if (!canInstallPackages) {
    return (
      <EuiConfirmModal
        title={i18n.translate(
          'xpack.monitoring.esNavigation.ingestPipelineModal.noPermissionToInstallPackage.packageRequiredTitle',
          { defaultMessage: 'Elasticsearch integration is required' }
        )}
        confirmButtonText={i18n.translate(
          'xpack.monitoring.esNavigation.ingestPipelineModal.noPermissionToInstallPackage.confirmButtonText',
          { defaultMessage: 'OK' }
        )}
        onCancel={closeModal}
        onConfirm={closeModal}
      >
        <p>
          <FormattedMessage
            id="xpack.monitoring.esNavigation.ingestPipelineModal.noPermissionToInstallPackage.descriptionText"
            defaultMessage="Viewing Ingest pipeline metrics requires installing the Elasticsearch integration. You must ask your administrator to install it."
          />
        </p>
      </EuiConfirmModal>
    );
  }

  return (
    <EuiConfirmModal
      title={i18n.translate(
        'xpack.monitoring.esNavigation.ingestPipelineModal.installPromptTitle',
        {
          defaultMessage: 'Install Elasticsearch integration?',
        }
      )}
      confirmButtonText={i18n.translate(
        'xpack.monitoring.esNavigation.ingestPipelineModal.installButtonText',
        { defaultMessage: 'Install' }
      )}
      cancelButtonText={i18n.translate(
        'xpack.monitoring.esNavigation.ingestPipelineModal.cancelButtonText',
        { defaultMessage: 'Cancel' }
      )}
      confirmButtonDisabled={installing}
      onCancel={closeModal}
      onConfirm={async () => {
        setInstalling(true);
        try {
          await installPackage();
          closeModal();
          navigateToDashboard();
        } catch (e) {
          setError(e.body?.error || e.message);
          setInstalling(false);
        }
      }}
    >
      {error && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.monitoring.esNavigation.ingestPipelineModal.errorCalloutText"
                defaultMessage="Could not install the package due to an error: {error}"
                values={{ error }}
              />
            }
            color="danger"
            iconType="warning"
          />
          <EuiSpacer />
        </>
      )}
      <p>
        <FormattedMessage
          id="xpack.monitoring.esNavigation.ingestPipelineModal.installPromptDescriptionText"
          defaultMessage="Viewing Ingest pipeline metrics requires installing the Elasticsearch integration. Do you
          want to install it now?"
        />
      </p>
    </EuiConfirmModal>
  );
};
