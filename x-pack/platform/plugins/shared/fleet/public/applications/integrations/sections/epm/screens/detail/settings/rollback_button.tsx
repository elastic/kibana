/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import type { InstallationInfo } from '../../../../../../../../server/types';

import type { PackageInfo } from '../../../../../types';
import { useAuthz } from '../../../../../hooks';
import { useInstalledIntegrationsActions } from '../../installed_integrations/hooks/use_installed_integrations_actions';

interface RollbackButtonProps {
  packageInfo: PackageInfo & { installationInfo?: InstallationInfo };
}
export function RollbackButton({ packageInfo }: RollbackButtonProps) {
  const canRollbackPackages = useAuthz().integrations.installPackages;
  const hasPreviousVersion = !!packageInfo?.installationInfo?.previous_version;

  const {
    actions: { bulkRollbackIntegrationsWithConfirmModal },
  } = useInstalledIntegrationsActions();

  const openRollbackModal = useCallback(async () => {
    return bulkRollbackIntegrationsWithConfirmModal([packageInfo as any]);
  }, [packageInfo, bulkRollbackIntegrationsWithConfirmModal]);

  return (
    <>
      <EuiButton
        data-test-subj="rollbackButton"
        iconType={'returnKey'}
        onClick={openRollbackModal}
        color="primary"
        disabled={!canRollbackPackages || !hasPreviousVersion}
      >
        <FormattedMessage
          id="xpack.fleet.integrations.uninstallPackage.rollbackPackageButtonLabel"
          defaultMessage="Rollback {title}"
          values={{
            title: packageInfo.title,
          }}
        />
      </EuiButton>
    </>
  );
}
