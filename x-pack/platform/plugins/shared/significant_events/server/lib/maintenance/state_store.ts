/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SignificantEventsMaintenanceSummary } from '../../../common/maintenance/types';
import {
  DEFAULT_MAINTENANCE_STATE,
  isMaintenanceState,
  type SignificantEventsMaintenanceState,
} from '../../../common/maintenance/state_machine';
import {
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID,
  SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
  type SignificantEventsMaintenanceStateAttributes,
} from './saved_object';

/** Normalise a persisted (possibly newer/unknown) state string to a known state. */
export const normalizeState = (raw: string | undefined): SignificantEventsMaintenanceState =>
  // Fail-open: unknown values from a newer node are treated as running so an
  // older node does not permanently block activity it cannot interpret.
  raw && isMaintenanceState(raw) ? raw : DEFAULT_MAINTENANCE_STATE;

/**
 * The persisted summary stores `state` as a free-form string (see the saved
 * object); narrow it back to a known state when reading.
 */
export const normalizeSummary = (
  raw: SignificantEventsMaintenanceStateAttributes['lastSummary']
): SignificantEventsMaintenanceSummary | undefined =>
  raw ? { ...raw, state: normalizeState(raw.state) } : undefined;

export const emptySummary = (
  state: SignificantEventsMaintenanceSummary['state']
): SignificantEventsMaintenanceSummary => ({
  state,
  executionsCancelled: 0,
  workflowsDisabled: 0,
  rulesDisabled: 0,
  partialFailures: [],
});

/** Read the single deployment-wide state document, or `undefined` if none exists. */
export const readState = async (
  soClient: SavedObjectsClientContract
): Promise<SignificantEventsMaintenanceStateAttributes | undefined> => {
  try {
    const so = await soClient.get<SignificantEventsMaintenanceStateAttributes>(
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
      SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID
    );
    return so.attributes;
  } catch (error) {
    if (SavedObjectsErrorHelpers.isNotFoundError(error as Error)) {
      return undefined;
    }
    throw error;
  }
};

export const writeState = async (
  soClient: SavedObjectsClientContract,
  attributes: SignificantEventsMaintenanceStateAttributes
): Promise<void> => {
  await soClient.create<SignificantEventsMaintenanceStateAttributes>(
    SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_TYPE,
    attributes,
    { id: SIGNIFICANT_EVENTS_MAINTENANCE_STATE_SO_ID, overwrite: true }
  );
};

/** Read only the normalized maintenance state (no summary/settings parsing). */
export const getState = async (
  soClient: SavedObjectsClientContract
): Promise<SignificantEventsMaintenanceState> => normalizeState((await readState(soClient))?.state);
