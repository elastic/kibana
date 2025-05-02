/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiIcon, EuiToolTip } from '@elastic/eui';

import classnames from 'classnames';

import type { EpmPackageInstallStatus } from '../../../../../../common/types';

export interface CompressedInstallationStylesProps {
  compressedInstallationStatus: string;
  compressedActiveStatusIcon: string;
  compressedInstalledStatusIcon: string;
  compressedActiveStatus: string;
  compressedInstalledStatus: string;
}

export const CompressedInstallationStatus: React.FC<{
  installStatus: EpmPackageInstallStatus | null | undefined;
  isActive?: boolean;
  installedTooltip: string;
  installFailedTooltip: string;
  styles: CompressedInstallationStylesProps;
}> = ({ installStatus, isActive, installedTooltip, installFailedTooltip, styles }) => {
  const cardPanelClassNames = classnames({
    [styles.compressedInstallationStatus]: true,
    [styles.compressedInstalledStatus]: !isActive,
    [styles.compressedActiveStatus]: isActive,
  });

  return (
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
          content={installStatus === 'installed' ? installedTooltip : installFailedTooltip}
        >
          <EuiIcon
            data-test-subj="compressed-installed-icon"
            type="warningFilled"
            className={styles.compressedInstalledStatusIcon}
          />
        </EuiToolTip>
      )}
    </div>
  );
};
