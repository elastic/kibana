/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { MultiMetricDetectors } from './metric_selection';
import { MultiMetricSettings } from './settings';

interface Props {
  isActive: boolean;
  setCanProceed: (proceed: boolean) => void;
}

export const MultiMetricView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [metricsValid, setMetricValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    setCanProceed(metricsValid && settingsValid);
  }, [metricsValid, settingsValid]);

  return (
    <Fragment>
      <MultiMetricDetectors isActive={isActive} setIsValid={setMetricValid} />
      {metricsValid && isActive && (
        <Fragment>
          <EuiHorizontalRule margin="l" />
          <MultiMetricSettings isActive={isActive} setIsValid={setSettingsValid} />
        </Fragment>
      )}
    </Fragment>
  );
};
