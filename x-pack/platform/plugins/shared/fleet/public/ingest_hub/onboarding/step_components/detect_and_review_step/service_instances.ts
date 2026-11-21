/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDuplicateInstanceIdPrefix,
  type ServiceSettingsPersistedState,
} from '../service_settings_step/use_service_settings';

/** Instance ids of a service: the original plus any duplicates the user created in Step 2. */
export const getServiceInstanceIds = (
  serviceId: string,
  serviceSettings: ServiceSettingsPersistedState
): string[] => {
  const { instances, serviceVars = {} } = serviceSettings;
  // A resumed session restores serviceVars but not instances. The original always exists but may
  // have no saved vars, so rebuild it from the service id plus any saved duplicate keys.
  const instanceIds = instances
    ? instances.filter((inst) => inst.serviceId === serviceId).map((inst) => inst.instanceId)
    : [
        serviceId,
        ...Object.keys(serviceVars).filter((id) =>
          id.startsWith(getDuplicateInstanceIdPrefix(serviceId))
        ),
      ];
  if (instanceIds.length === 0) instanceIds.push(serviceId);
  return instanceIds;
};
