/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Lifecycle state of Significant Events background activity.
 *
 * This is modelled as a small finite state machine rather than a boolean so new
 * states (e.g. a future `stopped`/`reset`) can be added by extending this union
 * and {@link MAINTENANCE_STATE_MACHINE} below, without introducing a new saved
 * object or changing its shape.
 */
export type SignificantEventsMaintenanceState = 'enabled' | 'paused';

/** State assumed when no maintenance document has been persisted yet. */
export const DEFAULT_MAINTENANCE_STATE: SignificantEventsMaintenanceState = 'enabled';

export interface MaintenanceStateDefinition {
  /**
   * Whether new background activity (manual triggers, enabling schedules) is
   * blocked while in this state. Guards read this flag rather than comparing to
   * a specific state, so a new blocking state is enforced automatically.
   */
  readonly blocksNewActivity: boolean;
}

export const MAINTENANCE_STATE_MACHINE: Readonly<
  Record<SignificantEventsMaintenanceState, MaintenanceStateDefinition>
> = {
  enabled: { blocksNewActivity: false },
  paused: { blocksNewActivity: true },
};

/** Type guard narrowing an arbitrary persisted string to a known state. */
export const isMaintenanceState = (value: string): value is SignificantEventsMaintenanceState =>
  Object.hasOwn(MAINTENANCE_STATE_MACHINE, value);

/** Whether the given state blocks new background activity. */
export const stateBlocksNewActivity = (state: SignificantEventsMaintenanceState): boolean =>
  MAINTENANCE_STATE_MACHINE[state].blocksNewActivity;
