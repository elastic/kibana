/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EXECUTED_BY_FILTER_FIELD,
  LEGACY_EXECUTED_BY_FILTER_FIELD,
} from './workflow_executions_page_constants';
import type { FilterControlConfig } from '../../shared/ui/filter_controls';

const EXECUTOR_FILTER_FIELDS = new Set<string>([
  LEGACY_EXECUTED_BY_FILTER_FIELD,
  EXECUTED_BY_FILTER_FIELD,
]);

/** Points a saved Triggered by control at the display name, or removes it when identities are hidden. */
export const migrateExecutionFilterControls = (
  controls: FilterControlConfig[],
  showExecutor: boolean
): FilterControlConfig[] => {
  if (!showExecutor) {
    return controls.filter((control) => !EXECUTOR_FILTER_FIELDS.has(control.field_name));
  }

  const hasDisplayNameControl = controls.some(
    (control) => control.field_name === EXECUTED_BY_FILTER_FIELD
  );

  return controls.flatMap((control) => {
    if (control.field_name !== LEGACY_EXECUTED_BY_FILTER_FIELD) {
      return [control];
    }
    if (hasDisplayNameControl) {
      return [];
    }
    return [
      {
        ...control,
        field_name: EXECUTED_BY_FILTER_FIELD,
        selected_options: [],
      },
    ];
  });
};
