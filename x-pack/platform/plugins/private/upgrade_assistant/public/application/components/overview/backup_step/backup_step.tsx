/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiStepProps } from '@elastic/eui/src/components/steps/step';

import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { OnPremBackup } from './on_prem_backup';
import { CloudBackup } from './cloud_backup';
import type { OverviewStepProps } from '../../types';

const title = i18n.translate('xpack.upgradeAssistant.overview.backupStepTitle', {
  defaultMessage: 'Back up your data',
});

interface Props extends OverviewStepProps {
  cloud?: CloudSetup;
}

const BackupStep = ({ cloud, setIsComplete }: Omit<Props, 'isComplete'>) => {
  const [forceOnPremStep, setForceOnPremStep] = useState(false);

  if (cloud?.isCloudEnabled && !forceOnPremStep) {
    return (
      <CloudBackup
        setIsComplete={setIsComplete}
        cloudSnapshotsUrl={cloud!.snapshotsUrl!}
        setForceOnPremStep={setForceOnPremStep}
      />
    );
  }

  return <OnPremBackup />;
};

export const getBackupStep = ({ cloud, isComplete, setIsComplete }: Props): EuiStepProps => {
  const status = cloud?.isCloudEnabled ? (isComplete ? 'complete' : 'incomplete') : 'incomplete';

  return {
    title,
    status,
    'data-test-subj': `backupStep-${status}`,
    children: <BackupStep cloud={cloud} setIsComplete={setIsComplete} />,
  };
};
