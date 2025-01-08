/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  AbsoluteTimings,
  PhaseAgeInMilliseconds,
  RelativePhaseTimingInMs,
} from './absolute_timing_to_relative_timing';
export {
  calculateRelativeFromAbsoluteMilliseconds,
  formDataToAbsoluteTimings,
  getPhaseMinAgeInMilliseconds,
} from './absolute_timing_to_relative_timing';

export { getDefaultRepository } from './get_default_repository';
