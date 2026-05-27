/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AwsServiceMatrixEntry,
  DeliveryMethod,
  DeliveryMethodEntry,
  AwsServiceVarsSource,
} from '@kbn/fleet-plugin/public/components/cloud_connector/aws_cloud_connector/aws_services_matrix';

export type StackMechanism = 'identity_federation' | 'firehose' | 'cloud_forwarder';

export interface ComputeRequiredStacksParams {
  selectedServices: AwsServiceMatrixEntry[];
  serviceVars: Record<string, AwsServiceVarsSource[]>;
  authType: 'identity_federation' | 'static_keys';
  isNewConnection: boolean;
}

export interface RequiredStack {
  mechanism: StackMechanism;
  services: AwsServiceMatrixEntry[];
  serviceVars: Record<string, AwsServiceVarsSource[]>;
}

/**
 * Returns the primary delivery method for a service entry.
 * If any entry has `preferred: true`, that method wins; otherwise the first entry is used.
 */
export const getPrimaryMethod = (entry: AwsServiceMatrixEntry): DeliveryMethod => {
  const preferred = entry.deliveryMethods.find((dm: DeliveryMethodEntry) => dm.preferred === true);
  return preferred ? preferred.method : entry.deliveryMethods[0].method;
};

const STACK_ORDER: StackMechanism[] = ['identity_federation', 'firehose', 'cloud_forwarder'];

/**
 * Determines which CFN stacks are required for the given service selection.
 *
 * Each selected service is assigned to exactly one mechanism via its primary delivery method.
 * Services are then grouped by mechanism, and stacks are included/excluded:
 *   - Identity Federation: only when authType is identity_federation, isNewConnection is true,
 *     and at least one agentless-primary service is selected.
 *   - Firehose: when at least one firehose-primary service is selected.
 *   - Cloud Forwarder: when at least one cloud_forwarder-primary service is selected.
 *
 * Return order is always IF -> Firehose -> Cloud Forwarder.
 */
export const computeRequiredStacks = ({
  selectedServices,
  serviceVars,
  authType,
  isNewConnection,
}: ComputeRequiredStacksParams): RequiredStack[] => {
  const groups: Record<DeliveryMethod, AwsServiceMatrixEntry[]> = {
    agentless: [],
    firehose: [],
    cloud_forwarder: [],
  };

  for (const service of selectedServices) {
    const primary = getPrimaryMethod(service);
    groups[primary].push(service);
  }

  const partitionVars = (
    services: AwsServiceMatrixEntry[]
  ): Record<string, AwsServiceVarsSource[]> => {
    const result: Record<string, AwsServiceVarsSource[]> = {};
    for (const svc of services) {
      if (serviceVars[svc.id]) {
        result[svc.id] = serviceVars[svc.id];
      }
    }
    return result;
  };

  const stacks: RequiredStack[] = [];

  for (const mechanism of STACK_ORDER) {
    if (mechanism === 'identity_federation') {
      if (authType === 'identity_federation' && isNewConnection && groups.agentless.length > 0) {
        stacks.push({
          mechanism: 'identity_federation',
          services: groups.agentless,
          serviceVars: partitionVars(groups.agentless),
        });
      }
      continue;
    }

    const group = groups[mechanism];
    if (group.length > 0) {
      stacks.push({
        mechanism,
        services: group,
        serviceVars: partitionVars(group),
      });
    }
  }

  return stacks;
};
