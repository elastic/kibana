/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { EuiSpacer, EuiButton } from '@elastic/eui';

import { StepsState } from '../cloud_migrator';

interface Props {
  onUpdate(updatedData: { isComplete: boolean }): void;
  stepsState: StepsState;
  isEnabled: boolean;
}

export const MigrateData = ({ onUpdate, isEnabled, stepsState }: Props) => {
  const [isMigrating, setIsMigrating] = useState<boolean>(false);

  const migrateData = () => {
    setIsMigrating(true);

    // This was left for POC DEMO purpose
    /* eslint-disable no-console */
    console.log('------- MIGRATING DATA TO CLOUD  --------');
    console.log(JSON.stringify(stepsState.step1.data!.decoded, null, 2));
    console.log('------------------------------------------');
    /* eslint-enable no-console */

    setTimeout(() => {
      setIsMigrating(false);
      onUpdate({ isComplete: true });
    }, 2000);
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <>
      <p>
        We are almost there! We will migrate now your indices and data to your new cloud cluster.
      </p>
      <EuiSpacer />
      <EuiButton color="primary" isLoading={isMigrating} onClick={migrateData}>
        Migrate my data
      </EuiButton>
    </>
  );
};
