/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceInstance } from '../service_settings_step/use_service_settings';
import { compactPolicySettings, type PolicySettings } from '../../common/policy_settings';

interface SOSettingsSource {
  integrationName?: string;
  description?: string;
  namespace?: string;
  instances?: ServiceInstance[];
  policySettings?: PolicySettings;
}

/**
 * The service instances as the saved object stores them: only the fields a resume needs to rebuild
 * the Service settings rows. Left out when there are none, so a write never clears a stored list
 * with an empty one. The list is empty only when nothing could be reconciled yet: on a resume of a
 * record saved without instances, while the services map is still loading, no service has a base
 * row. Clearing the stored list then would lose its duplicates, while leaving it can at worst keep
 * a stale one, and the deploy write also sends `services`, so a resume drops the instances of any
 * service that is no longer selected.
 */
const toSOInstances = (
  instances: ServiceInstance[] | undefined
): { instances?: ServiceInstance[] } =>
  instances?.length
    ? {
        instances: instances.map(({ instanceId, serviceId, name, isDuplicate }) => ({
          instanceId,
          serviceId,
          name,
          isDuplicate,
        })),
      }
    : {};

/**
 * The integration name, description, global namespace, service instances and package policy
 * settings for a saved-object write. Spread into every create and update that carries the service selection, so resume sees
 * what the last deploy used (the name can change between deploys while it still follows the
 * selection).
 */
export const toSOSettings = (
  serviceSettings: SOSettingsSource | null | undefined
): {
  integrationName?: string;
  description?: string;
  namespace?: string;
  instances?: ServiceInstance[];
  policySettings?: Record<string, unknown>;
} => {
  const policySettings = compactPolicySettings(serviceSettings?.policySettings);
  const integrationName = serviceSettings?.integrationName?.trim();
  const description = serviceSettings?.description?.trim();
  const namespace = serviceSettings?.namespace?.trim();
  return {
    ...(integrationName ? { integrationName } : {}),
    ...(description ? { description } : {}),
    ...(namespace ? { namespace } : {}),
    ...toSOInstances(serviceSettings?.instances),
    ...(Object.keys(policySettings).length ? { policySettings } : {}),
  };
};

/**
 * Same fields for an update: a blank description or namespace is sent as `null`, and the package
 * policy settings are always sent (empty when none has a value), because an omitted field keeps the
 * stored value and the user may just have cleared it.
 */
export const toSOSettingsUpdate = (
  serviceSettings: SOSettingsSource | null | undefined
): {
  integrationName?: string;
  description: string | null;
  namespace: string | null;
  instances?: ServiceInstance[];
  policySettings: Record<string, unknown>;
} => {
  const { integrationName, description, namespace, instances, policySettings } =
    toSOSettings(serviceSettings);
  return {
    ...(integrationName ? { integrationName } : {}),
    description: description ?? null,
    namespace: namespace ?? null,
    ...(instances ? { instances } : {}),
    policySettings: policySettings ?? {},
  };
};

/**
 * The update for settings that need no deploy: the name and description. The namespace, the
 * instances and the package policy settings are left out on purpose. They describe what was last
 * deployed: the namespace and the package policy settings are the values drift detection compares
 * the current ones against, and a duplicate added in Step 2 but not deployed yet must not come back
 * on resume. All are saved only together with a deploy.
 */
export const toSOMetadataUpdate = (
  serviceSettings: SOSettingsSource | null | undefined
): { integrationName?: string; description: string | null } => {
  const { namespace, instances, policySettings, ...metadata } = toSOSettingsUpdate(serviceSettings);
  return metadata;
};
