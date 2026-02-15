/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  DownsamplePhase,
  TimeUnit,
  IlmPhasesFlyoutFormInternal,
  IlmPhasesFlyoutFormOutput,
} from './types';
export { DOWNSAMPLE_PHASES } from './types';
export { getIlmPhasesFlyoutFormSchema } from './schema';
export { createIlmPhasesFlyoutDeserializer } from './deserializer';
export { createIlmPhasesFlyoutSerializer } from './serializer';
export {
  type OnFieldErrorsChange,
  OnFieldErrorsChangeProvider,
  useIlmPhasesFlyoutTabErrors,
  useOnFieldErrorsChange,
} from './error_tracking';
export {
  ifExistsNumberNonNegative,
  minAgeGreaterThanPreviousPhase,
  minAgeMustBeInteger,
  requiredMinAgeValue,
} from './validations';
export { toMilliseconds, parseInterval } from './utils';
export {
  DownsampleIntervalField,
  DeleteSearchableSnapshotToggleField,
  MinAgeField,
  ReadOnlyToggleField,
  SearchableSnapshotRepositoryField,
} from './fields';
