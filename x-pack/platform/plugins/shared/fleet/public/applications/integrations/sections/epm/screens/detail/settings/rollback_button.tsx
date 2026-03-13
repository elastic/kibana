/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { InstallationInfo } from '../../../../../../../../server/types';

import { InstallStatus, type PackageInfo } from '../../../../../types';
import {
  useAuthz,
  useGetPackageInstallStatus,
  useGetRollbackAvailableCheck,
  useLicense,
  useRollbackPackage,
} from '../../../../../hooks';
import { useInstalledIntegrationsActions } from '../../installed_integrations/hooks/use_installed_integrations_actions';
import { wrapTitleWithDeprecated } from '../../../components/utils';

interface RollbackButtonProps {
  packageInfo: PackageInfo & { installationInfo?: InstallationInfo };
  isCustomPackage: boolean;
}
export function RollbackButton({ packageInfo, isCustomPackage }: RollbackButtonProps) {
  const canRollbackPackages = useAuthz().integrations.installPackages;
  const licenseService = useLicense();
  const { isAvailable, reason } = useGetRollbackAvailableCheck(packageInfo.name);
  const hasPreviousVersion = !!packageInfo?.installationInfo?.previous_version;
  const isRollbackTTLExpired = !!packageInfo.installationInfo?.is_rollback_ttl_expired;
  const isUploadedPackage = packageInfo.installationInfo?.install_source === 'upload';
  const isRegistryPackage = packageInfo.installationInfo?.install_source === 'registry';

  const {
    actions: { bulkRollbackIntegrationsWithConfirmModal },
  } = useInstalledIntegrationsActions();
  const rollbackPackage = useRollbackPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(packageInfo.name);
  const isRollingBack = installationStatus === InstallStatus.rollingBack;
  const isReinstalling = installationStatus === InstallStatus.reinstalling;
  const isUninstalling = installationStatus === InstallStatus.uninstalling;
  const isInstalling = installationStatus === InstallStatus.installing;

  const isDisabled =
    !canRollbackPackages ||
    !hasPreviousVersion ||
    isUploadedPackage ||
    !isRegistryPackage ||
    isCustomPackage ||
    !licenseService.isEnterprise() ||
    isRollbackTTLExpired ||
    !isAvailable ||
    isReinstalling ||
    isUninstalling ||
    isInstalling;

  const openRollbackModal = useCallback(async () => {
    await rollbackPackage(packageInfo, bulkRollbackIntegrationsWithConfirmModal);
  }, [packageInfo, rollbackPackage, bulkRollbackIntegrationsWithConfirmModal]);

  const rollbackButton = (
    <EuiButton
      data-test-subj="rollbackButton"
      iconType={'returnKey'}
      isLoading={isRollingBack}
      onClick={openRollbackModal}
      color="primary"
      disabled={isDisabled}
    >
      <FormattedMessage
        id="xpack.fleet.integrations.rollbackPackage.rollbackPackageButtonLabel"
        defaultMessage="Rollback {title}"
        values={{
          title: wrapTitleWithDeprecated({ packageInfo }),
        }}
      />
    </EuiButton>
  );

  return (
    <>
      {isDisabled ? (
        <EuiToolTip
          content={
            !hasPreviousVersion ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.noVersionTooltip"
                defaultMessage="You can't rollback this integration because it does not have a previous version saved."
              />
            ) : !canRollbackPackages ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.noPermissionTooltip"
                defaultMessage="You don't have permissions to rollback integrations. Contact your administrator."
              />
            ) : isUploadedPackage ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.uploadedTooltip"
                defaultMessage="This integration was installed by upload and cannot be rolled back."
              />
            ) : isCustomPackage ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.customTooltip"
                defaultMessage="Custom integrations cannot be rolled back."
              />
            ) : !isRegistryPackage ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.registryTooltip"
                defaultMessage="This integration was not installed from the registry and cannot be rolled back."
              />
            ) : !licenseService.isEnterprise() ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.licenseTooltip"
                defaultMessage="Rolling back integrations requires an Enterprise license."
              />
            ) : isRollbackTTLExpired ? (
              <FormattedMessage
                id="xpack.fleet.integrations.rollbackPackage.rollbackTTLExpiredTooltip"
                defaultMessage="You can no longer roll back this integration."
              />
            ) : !isAvailable && reason ? (
              reason
            ) : null
          }
        >
          {rollbackButton}
        </EuiToolTip>
      ) : (
        rollbackButton
      )}
    </>
  );
}
