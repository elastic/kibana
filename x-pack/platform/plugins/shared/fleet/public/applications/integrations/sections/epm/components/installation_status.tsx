/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

import { useKibanaIsDarkMode } from '@kbn/react-kibana-context-theme';

import { installationStatuses } from '../../../../../../common/constants';
import type { EpmPackageInstallStatus } from '../../../../../../common/types';

import {
  CompressedInstallationStatus,
  type CompressedInstallationStylesProps,
} from './compressed_installation_status';

interface InstallationStatusProps {
  installStatus: EpmPackageInstallStatus | null | undefined;
  showInstallationStatus?: boolean;
  compressed?: boolean;
  hasDataStreams?: boolean;
}

export interface InstallationStatusStylesProps {
  installationStatus: string;
  installedCallout: string;
  installedSpacer: string;
}

const installedLabel = i18n.translate('xpack.fleet.packageCard.installedLabel', {
  defaultMessage: 'Installed',
});

const installedTooltip = i18n.translate('xpack.fleet.packageCard.installedTooltip', {
  defaultMessage: 'This package is installed but no data streams exist.',
});

const installFailedTooltip = i18n.translate('xpack.fleet.packageCard.installFailedTooltip', {
  defaultMessage: 'This package is installed but failed.',
});

const activeLabel = i18n.translate('xpack.fleet.packageCard.activeLabel', {
  defaultMessage: 'Active',
});

const getCalloutText = ({
  installStatus,
  isActive,
}: {
  installStatus: EpmPackageInstallStatus | null | undefined;
  isActive?: boolean;
}) => {
  if (isActive) {
    return {
      color: 'success' as const,
      iconType: 'check',
      title: activeLabel,
    };
  }

  if (
    installStatus === installationStatuses.Installed ||
    installStatus === installationStatuses.InstallFailed
  ) {
    return {
      color: 'warning' as const,
      iconType: 'warning',
      title: (
        <EuiToolTip
          data-test-subj="installed-tooltip"
          position="bottom"
          content={
            installStatus === installationStatuses.Installed
              ? installedTooltip
              : installFailedTooltip
          }
        >
          <>{installedLabel}</>
        </EuiToolTip>
      ),
    };
  }
  return {};
};

const useInstallationStatusStyles = (): InstallationStatusStylesProps &
  CompressedInstallationStylesProps => {
  const { euiTheme } = useEuiTheme();
  const isDarkMode = useKibanaIsDarkMode();

  return React.useMemo(
    () => ({
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
      `,
      compressedInstalledStatus: css`
        background-color: ${isDarkMode
          ? euiTheme.colors.warning
          : euiTheme.colors.backgroundBaseWarning};
      `,
      compressedActiveStatus: css`
        background-color: ${isDarkMode
          ? euiTheme.colors.success
          : euiTheme.colors.backgroundBaseSuccess};
      `,
      compressedInstalledStatusIcon: css`
        color: ${isDarkMode ? euiTheme.colors.emptyShade : euiTheme.colors.textWarning};
      `,
      compressedActiveStatusIcon: css`
        color: ${isDarkMode ? euiTheme.colors.emptyShade : euiTheme.colors.textSuccess};
      `,
      installedCallout: css`
        padding: ${euiTheme.size.s} ${euiTheme.size.m};
        text-align: center;
      `,
      installedSpacer: css`
        background: ${euiTheme.colors.emptyShade};
      `,
    }),
    [euiTheme, isDarkMode]
  );
};

export const getLineClampStyles = (lineClamp?: number) =>
  lineClamp
    ? `-webkit-line-clamp: ${lineClamp};display: -webkit-box;-webkit-box-orient: vertical;overflow: hidden;`
    : '';

export const shouldShowInstallationStatus = ({
  installStatus,
  isActive,
  showInstallationStatus,
}: {
  installStatus: EpmPackageInstallStatus | null | undefined;
  isActive?: boolean;
  showInstallationStatus?: boolean;
}) => {
  const installedStatus =
    installStatus === installationStatuses.Installed ||
    installStatus === installationStatuses.InstallFailed;

  return showInstallationStatus && (isActive || installedStatus);
};

export const InstallationStatus: React.FC<InstallationStatusProps> = React.memo(
  ({ installStatus, showInstallationStatus, compressed, hasDataStreams: isActive }) => {
    const styles = useInstallationStatusStyles();

    if (
      !shouldShowInstallationStatus({
        installStatus,
        showInstallationStatus,
        isActive,
      })
    ) {
      return null;
    }

    return compressed ? (
      <CompressedInstallationStatus
        installStatus={installStatus}
        isActive={isActive}
        installedTooltip={installedTooltip}
        installFailedTooltip={installFailedTooltip}
        styles={styles}
      />
    ) : (
      <div className={styles.installationStatus}>
        <EuiSpacer
          data-test-subj="installation-status-spacer"
          size="m"
          className={styles.installedSpacer}
        />
        <EuiCallOut
          data-test-subj="installation-status-callout"
          className={styles.installedCallout}
          {...getCalloutText({ installStatus, isActive })}
        />
      </div>
    );
  }
);
