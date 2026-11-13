/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry, ServiceInstance, ServiceVars } from '@kbn/fleet-plugin/common';
import { buildIacIntegrations, buildPackageInputs } from '@kbn/fleet-plugin/common';
import { buildDeployGroups } from './deploy_groups';

function makeService(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test_service',
    name: 'Test Service',
    signalTypes: ['logs'],
    dataStreams: ['test_service'],
    packageName: 'aws',
    deploymentMethods: [{ method: 'managed_integration', preferred: true }],
    inputs: ['aws-s3'],
    requiredConfig: [],
    identityFederationSupported: true,
    defaultEnabled: false,
    defaultEnabledInputs: [],
    showInUI: true,
    isManifestLoaded: true,
    isManifestError: false,
    isStaticAgentBasedOnly: false,
    ...overrides,
  };
}

/** A multi-data-stream service with per-DS manifest defaults that differ from the service-level ones. */
function makeMultiDsService(): AwsServiceMatrixEntry {
  return makeService({
    id: 'multi',
    dataStreams: ['ds_defaults', 'ds_inputs_only', 'ds_no_info'],
    inputs: ['aws-s3', 'aws-cloudwatch', 'httpjson'],
    defaultEnabledInputs: ['httpjson'],
    varDefsByDataStream: {
      ds_defaults: {
        inputs: ['aws-s3', 'aws-cloudwatch'],
        defaultEnabledInputs: ['aws-cloudwatch'],
        varDefsByInput: {},
      },
      ds_inputs_only: {
        inputs: ['aws-s3', 'aws-cloudwatch'],
        defaultEnabledInputs: [],
        varDefsByInput: {},
      },
    },
  });
}

/** Deploy-group member for an original (non-duplicate) instance of `service`. */
function original(service: AwsServiceMatrixEntry) {
  return {
    instance: {
      instanceId: service.id,
      serviceId: service.id,
      name: service.name,
      isDuplicate: false,
    },
    service,
  };
}

/** Deploy-group member for a duplicate instance of `service`, keyed like use_service_settings does. */
function duplicate(service: AwsServiceMatrixEntry, n = 1) {
  return {
    instance: {
      instanceId: `${service.id}__dup-${n}`,
      serviceId: service.id,
      name: `${service.name} [Duplicate]`,
      isDuplicate: true,
    },
    service,
  };
}

describe('buildIacIntegrations ↔ Deploy parity', () => {
  it('grants exactly the <policyTemplate>-<input> keys Deploy sends, per deploy group', () => {
    const multi = makeMultiDsService();
    const cloudtrail = makeService({
      id: 'cloudtrail',
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
    });
    const rdsOtel = makeService({
      id: 'rds_otel',
      policyTemplate: 'aws.rds',
      packageName: 'aws_cloudwatch_input_otel',
      dataStreams: ['rds_otel'],
      inputs: ['aws/metrics'],
    });
    const ecfOnly = makeService({
      id: 'waf',
      dataStreams: ['waf'],
      deploymentMethods: [{ method: 'ecf', preferred: true }],
    });
    const servicesMap = new Map(
      [multi, cloudtrail, rdsOtel, ecfOnly].map((service) => [service.id, service])
    );
    const selectedServiceIds = [...servicesMap.keys()];

    // Step-2 state: cloudtrail original explicitly emptied while its duplicate is active on a
    // different input; multi's duplicate is narrowed to one data stream and an input the
    // original does not use (aws-s3), so only the duplicate can grant multi-aws-s3.
    const instances: ServiceInstance[] = [
      original(multi).instance,
      duplicate(multi).instance,
      original(cloudtrail).instance,
      duplicate(cloudtrail).instance,
      original(rdsOtel).instance,
      original(ecfOnly).instance,
    ];
    const stored: Record<string, ServiceVars> = {
      multi: {
        enabledDataStreams: ['ds_defaults', 'ds_no_info'],
        varsByDataStream: { ds_no_info: { enabledInputs: ['httpjson'], varsByInput: {} } },
      },
      'multi__dup-1': {
        enabledDataStreams: ['ds_inputs_only'],
        varsByDataStream: { ds_inputs_only: { enabledInputs: ['aws-s3'], varsByInput: {} } },
      },
      cloudtrail: { enabledDataStreams: [], varsByDataStream: {} },
      'cloudtrail__dup-1': {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: { cloudtrail: { enabledInputs: ['aws-cloudwatch'], varsByInput: {} } },
      },
    };

    const groups = buildDeployGroups(instances, selectedServiceIds, servicesMap);

    // What Deploy sends: deployGroup builds one vars map per group keyed by service.id with the
    // instanceId → serviceId → default fallback, then calls buildPackageInputs for the group.
    const deployedKeys = new Set<string>();
    for (const group of groups) {
      const serviceVarsMap: Record<string, ServiceVars> = {};
      for (const { instance, service } of group.members) {
        serviceVarsMap[service.id] = stored[instance.instanceId] ??
          stored[instance.serviceId] ?? {
            enabledDataStreams: service.dataStreams,
            varsByDataStream: {},
          };
      }
      const inputs = buildPackageInputs(
        group.members.map(({ service }) => service),
        serviceVarsMap,
        'us-east-1'
      );
      for (const key of Object.keys(inputs)) deployedKeys.add(key);
    }

    // What the Federated Identity template grants.
    const grantedKeys = new Set(
      buildIacIntegrations(
        groups.flatMap((group) => group.members),
        stored
      ).flatMap((pkg) =>
        pkg.policyTemplates.flatMap((pt) => pt.enabledInputs.map((input) => `${pt.name}-${input}`))
      )
    );

    expect(grantedKeys).toEqual(deployedKeys);
    expect(grantedKeys).toEqual(
      new Set([
        'multi-aws-cloudwatch',
        'multi-aws-s3',
        'multi-httpjson',
        'cloudtrail-aws-cloudwatch',
        'aws.rds-aws/metrics',
      ])
    );
  });
});
