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
import { useAuthz, useGetPackageInstallStatus, useRollbackPackage } from '../../../../../hooks';
import { useInstalledIntegrationsActions } from '../../installed_integrations/hooks/use_installed_integrations_actions';

interface RollbackButtonProps {
  packageInfo: PackageInfo & { installationInfo?: InstallationInfo };
  isCustomPackage: boolean;
}
export function RollbackButton({ packageInfo, isCustomPackage }: RollbackButtonProps) {
  const canRollbackPackages = useAuthz().integrations.installPackages;
  const hasPreviousVersion = !!packageInfo?.installationInfo?.previous_version;
  const isUploadedPackage = packageInfo.installationInfo?.install_source === 'upload';
  const isDisabled =
    !canRollbackPackages || !hasPreviousVersion || isUploadedPackage || isCustomPackage;
  const {
    actions: { bulkRollbackIntegrationsWithConfirmModal },
  } = useInstalledIntegrationsActions();
  const rollbackPackage = useRollbackPackage();
  const getPackageInstallStatus = useGetPackageInstallStatus();
  const { status: installationStatus } = getPackageInstallStatus(packageInfo.name);
  const isRollingBack = installationStatus === InstallStatus.rollingBack;

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
          title: packageInfo.title,
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
