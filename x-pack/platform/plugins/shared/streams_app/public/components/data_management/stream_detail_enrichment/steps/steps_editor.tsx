/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import React from 'react';
import { NoStepsEmptyPrompt } from '../empty_prompts';
import { useInteractiveModeSelector } from '../state_management/stream_enrichment_state_machine';
import { RootSteps } from './root_steps';
import { useSimulationErrors } from '../state_management/use_simulation_errors';
import { SimulationErrorsList } from '../simulation_errors';

export const StepsEditor = React.memo(() => {
  const stepRefs = useInteractiveModeSelector((state) => state.context.stepRefs);

  const { errors: simulationErrors } = useSimulationErrors();

  const hasSteps = !isEmpty(stepRefs);

  return (
    <>
      {hasSteps ? <RootSteps stepRefs={stepRefs} /> : <NoStepsEmptyPrompt />}
      {(!isEmpty(simulationErrors.ignoredFields) ||
        !isEmpty(simulationErrors.mappingFailures) ||
        simulationErrors.definition_error) && <SimulationErrorsList errors={simulationErrors} />}
    </>
  );
});
