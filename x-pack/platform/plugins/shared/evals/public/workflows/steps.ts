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
 * Public (editor-facing) definitions for the evals workflow steps. They reuse the
 * shared common definitions so the YAML editor's schema/label/description stay in
 * lockstep with the server handlers. No custom `icon`/`editorHandlers` in v1.
 *
 * Each step is exported individually so the public plugin can register them via
 * lazy loaders (`() => import('./steps').then(...)`), keeping them out of the
 * plugin's setup bundle.
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
