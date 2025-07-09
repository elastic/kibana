/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * useSecretsStorage returns a boolean indicating whether the secrets storage feature is enabled
 * and the fleet status is ready.
 * This hook is publicly exported for use in other plugins.
 */
import { useFleetStatus } from './use_fleet_status';

export function useSecretsStorage(): boolean | undefined {
  const fleetStatus = useFleetStatus();

  return fleetStatus.isReady && fleetStatus.isSecretsStorageEnabled;
}
