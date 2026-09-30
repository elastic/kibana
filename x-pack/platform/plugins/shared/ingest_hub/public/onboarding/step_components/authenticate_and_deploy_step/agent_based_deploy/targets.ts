/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../../aws_service_matrix';
import type { ServiceInstance } from '../../service_settings_step/use_service_settings';
import type { DeployGroup } from '../deploy_groups';
import { reconcileInstances, groupByPackage } from '../deploy_group_helpers';

/** @deprecated Use DeployGroup from deploy_groups.ts directly. */
export interface AgentBasedTarget {
  instance: ServiceInstance;
  service: AwsServiceMatrixEntry;
}

/**
 * Build deploy groups from the current instance list.
 *
 * Grouping strategy:
 *   - Originals (isDuplicate: false): one group per package, bundled so all services of the same
 *     package share a single package policy document.
 *   - Duplicates (isDuplicate: true): one group per instance, because duplicate instances of the
 *     same service share the same stream key inside buildPackageInputs and would silently overwrite
 *     each other if bundled.
 *
 * Unlike buildDeployGroups, we accept ALL services regardless of deploymentMethods — the
 * agent-based path isn't restricted to services that declare `managed_integration`.
 */
export function buildAgentBasedTargets(
  instances: ServiceInstance[],
  selectedServiceIds: string[],
  servicesMap: Map<string, AwsServiceMatrixEntry>
): DeployGroup[] {
  const resolved: ServiceInstance[] = reconcileInstances(
    instances,
    selectedServiceIds,
    servicesMap
  );

  const originals: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> = [];
  const duplicates: Array<{ instance: ServiceInstance; service: AwsServiceMatrixEntry }> = [];

  for (const inst of resolved) {
    const service = servicesMap.get(inst.serviceId);
    if (!service) continue;
    if (inst.isDuplicate) {
      duplicates.push({ instance: inst, service });
    } else {
      originals.push({ instance: inst, service });
    }
  }

  return groupByPackage(originals, duplicates);
}
