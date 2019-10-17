/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC, useEffect, useState } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { AdvancedDetectors } from './metric_selection';
import { AdvancedSettings } from './settings';
import { ExtraSettings } from './extra';

interface Props {
  setCanProceed?: (proceed: boolean) => void;
}

export const AdvancedView: FC<Props> = ({ setCanProceed }) => {
  const [metricsValid, setMetricValid] = useState(false);
  const [settingsValid, setSettingsValid] = useState(false);

  useEffect(() => {
    if (typeof setCanProceed === 'function') {
      setCanProceed(metricsValid && settingsValid);
    }
  }, [metricsValid, settingsValid]);

  return (
    <Fragment>
      <Fragment>
        <ExtraSettings />
        <EuiHorizontalRule margin="l" />
        <AdvancedDetectors setIsValid={setMetricValid} />
        <EuiHorizontalRule margin="l" />
        <AdvancedSettings setIsValid={setSettingsValid} />
      </Fragment>
    </Fragment>
  );
};
