/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';

interface Props {
  isSettingUp: boolean;
  didSetupFail: boolean;
  hasCompletedSetup: boolean;
}

export const SuccessOrFailure: React.FunctionComponent<Props> = ({
  isSettingUp,
  didSetupFail,
  hasCompletedSetup,
}: Props) => {
  return (
    <>
      {isSettingUp ? (
        <EuiLoadingSpinner size="xl" />
      ) : didSetupFail ? (
        <div>Fail</div>
      ) : hasCompletedSetup ? (
        <div>Success</div>
      ) : (
        undefined
      )}
    </>
  );
};
