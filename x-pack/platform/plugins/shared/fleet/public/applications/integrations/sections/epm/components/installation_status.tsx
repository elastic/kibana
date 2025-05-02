/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  COLOR_MODES_STANDARD,
  EuiCallOut,
  EuiIcon,
  EuiSpacer,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';

import classnames from 'classnames';

import { installationStatuses } from '../../../../../../common/constants';
import type { EpmPackageInstallStatus } from '../../../../../../common/types';

interface InstallationStatusProps {
  installStatus: EpmPackageInstallStatus | null | undefined;
  showInstallationStatus?: boolean;
  compressed?: boolean;
  hasDataStreams?: boolean;
}

const installedLabel = i18n.translate('xpack.fleet.packageCard.installedLabel', {
  defaultMessage: 'Installed',
});

const installedTooltip = i18n.translate('xpack.fleet.packageCard.installedTooltip', {
  defaultMessage: 'This package is installed but no data streams exist.',
});

/**
 * "Active" here means that the package is installed AND their data streams Exist
 **/
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
  if (installStatus === 'install_failed') {
    return {
      color: 'warning' as const,
      iconType: 'warning' as const,
      title: installedLabel,
    };
  }
  if (isActive) {
    return {
      color: 'success' as const,
      iconType: 'check',
      title: activeLabel,
    };
  }
  if (installStatus === 'installed') {
    return {
      color: 'warning' as const,
      iconType: 'warning',
      title: (
        <EuiToolTip data-test-subj="installed-tooltip" position="bottom" content={installedTooltip}>
          <>{installedLabel}</>
        </EuiToolTip>
      ),
    };
  }
  return {};
};

const useInstallationStatusStyles = () => {
  const { euiTheme, colorMode } = useEuiTheme();
  const isDarkMode = colorMode === COLOR_MODES_STANDARD.dark;

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
  };
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

    const cardPanelClassNames = classnames({
      [styles.compressedInstallationStatus]: compressed,
      [styles.compressedInstalledStatus]: compressed && !isActive,
      [styles.compressedActiveStatus]: compressed && isActive,
      [styles.installationStatus]: !compressed,
    });

    return shouldShowInstallationStatus({
      installStatus,
      showInstallationStatus,
      isActive,
    }) ? (
      compressed ? (
        <div className={cardPanelClassNames}>
          {isActive ? (
            <EuiIcon
              data-test-subj="compressed-active-icon"
              type="checkInCircleFilled"
              className={styles.compressedActiveStatusIcon}
            />
          ) : (
            <EuiToolTip
              data-test-subj="compressed-installed-tooltip"
              position="bottom"
              content={installedTooltip}
            >
              <EuiIcon
                data-test-subj="compressed-installed-icon"
                type="warningFilled"
                className={styles.compressedInstalledStatusIcon}
              />
            </EuiToolTip>
          )}
        </div>
      ) : (
        <div className={cardPanelClassNames}>
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
      )
    ) : null;
  }
);
