/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  resolveDatasetCommonDefinition,
  executeTaskCommonDefinition,
  evaluateTraceCommonDefinition,
  ingestScoresCommonDefinition,
  evaluateExampleCommonDefinition,
  evaluateDatasetCommonDefinition,
  startExperimentCommonDefinition,
  compareExperimentsCommonDefinition,
} from '../../common/workflows/steps';

/**
 * Editor-facing step definitions, reusing the shared common definitions so the
 * YAML editor stays in lockstep with the server handlers. Exported individually
 * so the plugin can lazy-load them, keeping them out of the setup bundle.
 */
export const resolveDatasetPublicStep = createPublicStepDefinition({
  ...resolveDatasetCommonDefinition,
});

export const executeTaskPublicStep = createPublicStepDefinition({ ...executeTaskCommonDefinition });

export const evaluateTracePublicStep = createPublicStepDefinition({
  ...evaluateTraceCommonDefinition,
});

export const ingestScoresPublicStep = createPublicStepDefinition({
  ...ingestScoresCommonDefinition,
});

export const evaluateExamplePublicStep = createPublicStepDefinition({
  ...evaluateExampleCommonDefinition,
});

export const evaluateDatasetPublicStep = createPublicStepDefinition({
  ...evaluateDatasetCommonDefinition,
});

export const startExperimentPublicStep = createPublicStepDefinition({
  ...startExperimentCommonDefinition,
});

export const compareExperimentsPublicStep = createPublicStepDefinition({
  ...compareExperimentsCommonDefinition,
});
