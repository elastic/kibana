/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiIcon, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

import { useKibanaDarkMode } from '@kbn/react-kibana-context-theme';

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
  compressed?: boolean;
}

const useInstallationStatusStyles = () => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaDarkMode();
  const successBackgroundColor = euiTheme.colors.backgroundBaseSuccess;

  return {
    installationStatus: css`
      position: absolute;
      border-radius: 0 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium};
      bottom: 0;
      left: 0;
      width: 100%;
      overflow: hidden;
    `,
    compressedInstallationStatus: css`
      position: absolute;
      border-radius: 0 ${euiTheme.border.radius.medium} ${euiTheme.border.radius.medium} 0;
      bottom: 0;
      right: 0;
      width: 65px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
      background-color: ${isDarkMode ? euiTheme.colors.success : successBackgroundColor};
      color: ${isDarkMode ? euiTheme.colors.emptyShade : euiTheme.colors.textSuccess};
    `,
    compressedInstallationStatusIcon: css`
      color: ${isDarkMode ? euiTheme.colors.emptyShade : euiTheme.colors.textSuccess};
    `,
    installationStatusCallout: css`
      padding: ${euiTheme.size.s} ${euiTheme.size.m};
      text-align: center;
    `,
    installationStatusSpacer: css`
      background: ${euiTheme.colors.emptyShade};
    `,
  };
};

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
  ({ installStatus, showInstallationStatus, compressed }) => {
    const styles = useInstallationStatusStyles();

    const cardPanelClassName = compressed
      ? styles.compressedInstallationStatus
      : styles.installationStatus;

    return shouldShowInstallationStatus({ installStatus, showInstallationStatus }) ? (
      compressed ? (
        <div className={cardPanelClassName}>
          <EuiIcon type="checkInCircleFilled" className={styles.compressedInstallationStatusIcon} />
        </div>
      ) : (
        <div className={cardPanelClassName}>
          <EuiSpacer
            data-test-subj="installation-status-spacer"
            size="m"
            className={styles.installationStatusSpacer}
          />
          <EuiCallOut
            data-test-subj="installation-status-callout"
            className={styles.installationStatusCallout}
            {...(installStatus ? installStatusMapToColor[installStatus] : {})}
          />
        </div>
      )
    ) : null;
  }
);
