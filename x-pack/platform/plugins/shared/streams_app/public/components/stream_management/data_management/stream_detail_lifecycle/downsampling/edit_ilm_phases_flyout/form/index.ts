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
export {
  getDownsampleFieldsToValidateOnChange,
  getIlmPhasesFlyoutFormSchema,
  getMinAgeFieldsToValidateOnChange,
} from './schema';
export { createMapFormValuesToIlmPolicyPhases, mapIlmPolicyPhasesToFormValues } from './mappers';
export { zodResolver } from '../../shared';
export {
  ILM_PHASES_FLYOUT_TAB_ERROR_INDICATOR_WATCH_PATHS,
  useIlmPhasesFlyoutTabErrors,
} from './error_tracking';
export { toMilliseconds, parseInterval } from './utils';
export {
  DownsampleIntervalField,
  DeleteSearchableSnapshotToggleField,
  MinAgeField,
  ReadOnlyToggleField,
  SearchableSnapshotRepositoryField,
} from './fields';
