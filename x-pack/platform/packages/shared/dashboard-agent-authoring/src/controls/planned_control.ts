/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import type { DashboardFailure } from '../utils';
import type { ControlInput } from './schema';

/** A requested control, with the identifier its failures are reported under. */
export interface PlannedControl {
  /** The control id, or its position in `controls` when it has none. */
  identifier: string;
  control: ControlInput;
  /** The id of the existing control this control replaces, if any. */
  replaces?: string;
}

/** A planned control with the id it is stored under. */
export type IdentifiedControl = Omit<PlannedControl, 'control'> & {
  control: ControlInput & { id: string };
};

/**
 * Whether a control that cannot be applied is reported. Controls the agent added on its own are
 * left out silently, but the replacement of an existing control is always reported.
 */
export const isReported = ({ control, replaces }: PlannedControl): boolean =>
  control.user_requested === true || replaces !== undefined;

/** Planned controls that can be applied, and a failure for each one that cannot. */
export interface ControlsResult {
  controls: PlannedControl[];
  failures: DashboardFailure[];
}

export const createControlFailure = (identifier: string, error: string): DashboardFailure => ({
  type: DASHBOARD_FAILURE_TYPES.upsertDashboard,
  kind: 'control',
  identifier,
  error,
});
