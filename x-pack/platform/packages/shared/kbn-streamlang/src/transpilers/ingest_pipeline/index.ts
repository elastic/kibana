/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipe } from 'fp-ts/function';
import { StreamlangDSL } from '../../../types/streamlang';
import { flattenSteps } from '../shared/flatten_steps';
import { convertStreamlangDSLActionsToIngestPipelineProcessors } from './conversions';

export const transpile = (streamlang: StreamlangDSL) => {
  const processors = pipe(
    flattenSteps(streamlang.steps),
    convertStreamlangDSLActionsToIngestPipelineProcessors
  );

  return {
    processors,
  };
};
