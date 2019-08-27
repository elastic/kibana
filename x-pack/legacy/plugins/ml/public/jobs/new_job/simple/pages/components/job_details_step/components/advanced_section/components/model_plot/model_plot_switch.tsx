/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState, useContext, useEffect } from 'react';
import { EuiSwitch } from '@elastic/eui';
import { JobCreatorContext } from '../../../../../job_creator_context';
import { Description } from './description';

export const ModelPlotSwitch: FC = () => {
  const { jobCreator, jobCreatorUpdate } = useContext(JobCreatorContext);
  const [modelPlotEnabled, setModelPlotEnabled] = useState(jobCreator.modelPlot);

  useEffect(() => {
    jobCreator.modelPlot = modelPlotEnabled;
    jobCreatorUpdate();
  }, [modelPlotEnabled]);

  function toggleModelPlot() {
    setModelPlotEnabled(!modelPlotEnabled);
  }

  return (
    <Description>
      <EuiSwitch
        name="switch"
        checked={modelPlotEnabled}
        onChange={toggleModelPlot}
        data-test-subj="mlJobWizardSwitchModelPlot"
      />
    </Description>
  );
};
