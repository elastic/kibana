/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance } from './use_service_settings';

/**
 * Reconcile persisted instances against the current selectedServiceIds.
 *
 * - Keeps only instances whose serviceId is in selectedServiceIds (drops deselected ones).
 * - Adds a base instance for each newly selected service not already covered.
 *
 * Without it, a user who goes back to step 1 and changes their selection would see, and deploy,
 * stale instances.
 */
export function reconcileInstances(
  instances: ServiceInstance[],
  selectedServiceIds: string[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): ServiceInstance[] {
  const selectedSet = new Set(selectedServiceIds);
  const kept = instances.filter((inst) => selectedSet.has(inst.serviceId));
  const coveredServiceIds = new Set(kept.map((i) => i.serviceId));
  const added: ServiceInstance[] = [];
  for (const id of selectedServiceIds) {
    if (!coveredServiceIds.has(id)) {
      const service = servicesMap.get(id);
      if (service?.showInUI) {
        added.push({ instanceId: id, serviceId: id, name: service.name, isDuplicate: false });
      }
    }
  }
  return [...kept, ...added];
}
