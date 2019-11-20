/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { MultiMetricDetectors } from './metric_selection';
import { MultiMetricDetectorsSummary } from './metric_selection_summary';
import { MultiMetricSettings } from './settings';

interface Props {
  isActive: boolean;
  setCanProceed?: (proceed: boolean) => void;
}

export const MultiMetricView: FC<Props> = ({ isActive, setCanProceed }) => {
  const [metricsValid, setMetricValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(metricsValid && settingsValid);
    }
  }, [metricsValid, settingsValid]);

  return (
    <Fragment>
      {isActive === false ? (
        <MultiMetricDetectorsSummary />
      ) : (
        <Fragment>
          <MultiMetricDetectors setIsValid={setMetricValid} />

          {metricsValid && (
            <Fragment>
              <EuiHorizontalRule margin="l" />
              <MultiMetricSettings setIsValid={setSettingsValid} />
            </Fragment>
          )}
        </Fragment>
      )}
    </Fragment>
  );
};
