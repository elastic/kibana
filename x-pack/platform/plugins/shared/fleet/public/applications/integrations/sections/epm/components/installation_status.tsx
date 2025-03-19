/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

import { installationStatuses } from '../../../../../../common/constants';
import type { EpmPackageInstallStatus } from '../../../../../../common/types';

const installedLabel = i18n.translate('xpack.fleet.packageCard.installedLabel', {
  defaultMessage: 'Installed',
});

const installStatusMapToColor: Record<
  string,
  { color: 'success' | 'warning'; iconType: string; title: string }
> = {
  installed: {
    color: 'success',
    iconType: 'check',
    title: installedLabel,
  },
  install_failed: {
    color: 'warning',
    iconType: 'warning',
    title: installedLabel,
  },
};

interface InstallationStatusProps {
  installStatus: EpmPackageInstallStatus | null | undefined;
  showInstallationStatus?: boolean;
}

export const getLineClampStyles = (lineClamp?: number) =>
  lineClamp
    ? `-webkit-line-clamp: ${lineClamp};display: -webkit-box;-webkit-box-orient: vertical;overflow: hidden;`
    : '';

export const shouldShowInstallationStatus = ({
  installStatus,
  showInstallationStatus,
}: InstallationStatusProps) =>
  showInstallationStatus &&
  (installStatus === installationStatuses.Installed ||
    installStatus === installationStatuses.InstallFailed);

export const InstallationStatus: React.FC<InstallationStatusProps> = React.memo(
  ({ installStatus, showInstallationStatus }) => {
    const { euiTheme } = useEuiTheme();
    return shouldShowInstallationStatus({ installStatus, showInstallationStatus }) ? (
      <div
        css={css`
          position: absolute;
          border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
          bottom: 0;
          left: 0;
          width: 100%;
          overflow: hidden;
        `}
      >
        <EuiSpacer
          data-test-subj="installation-status-spacer"
          size="m"
          css={css`
            background: ${euiTheme.colors.emptyShade};
          `}
        />
        <EuiCallOut
          data-test-subj="installation-status-callout"
          css={css`
            padding: ${euiTheme.size.s} ${euiTheme.size.m};
            text-align: center;
          `}
          {...(installStatus ? installStatusMapToColor[installStatus] : {})}
        />
      </div>
    ) : null;
  }
);
