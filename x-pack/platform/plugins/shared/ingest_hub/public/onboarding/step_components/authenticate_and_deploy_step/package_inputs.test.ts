/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import { buildDeployGroups } from './deploy_groups';
import { buildIacIntegrations, buildPackageInputs } from './package_inputs';

function makeService(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test_service',
    name: 'Test Service',
    category: 'compute',
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

describe('buildIacIntegrations', () => {
  it('builds one aws entry with all inputs for a never-configured single-DS service', () => {
    const service = makeService({
      id: 'cloudtrail',
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
    });

    expect(buildIacIntegrations([original(service)], {})).toEqual([
      {
        name: 'aws',
        policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-cloudwatch', 'aws-s3'] }],
      },
    ]);
  });

  it('groups two services of the same package into one entry with templates sorted by name', () => {
    const emr = makeService({ id: 'emr', dataStreams: ['emr_logs'], inputs: ['aws-s3'] });
    const ec2 = makeService({ id: 'ec2', dataStreams: ['ec2_logs'], inputs: ['aws-cloudwatch'] });

    expect(buildIacIntegrations([original(emr), original(ec2)], {})).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'ec2', enabledInputs: ['aws-cloudwatch'] },
          { name: 'emr', enabledInputs: ['aws-s3'] },
        ],
      },
    ]);
  });

  it('emits one entry per package, sorted by package name', () => {
    const otel = makeService({
      id: 'rds_otel',
      policyTemplate: 'aws.rds',
      packageName: 'aws_cloudwatch_input_otel',
      dataStreams: ['rds_otel'],
      inputs: ['aws/metrics'],
    });
    const rds = makeService({ id: 'rds', dataStreams: ['rds'], inputs: ['aws/metrics'] });

    expect(buildIacIntegrations([original(otel), original(rds)], {})).toEqual([
      { name: 'aws', policyTemplates: [{ name: 'rds', enabledInputs: ['aws/metrics'] }] },
      {
        name: 'aws_cloudwatch_input_otel',
        policyTemplates: [{ name: 'aws.rds', enabledInputs: ['aws/metrics'] }],
      },
    ]);
  });

  it('respects the inputs the user narrowed to', () => {
    const service = makeService({
      id: 'cloudtrail',
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
    });
    const stored: Record<string, ServiceVars> = {
      cloudtrail: {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: { cloudtrail: { enabledInputs: ['aws-s3'], varsByInput: {} } },
      },
    };

    expect(buildIacIntegrations([original(service)], stored)).toEqual([
      { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
    ]);
  });

  it('skips a service the user explicitly emptied (enabledDataStreams: [])', () => {
    const ec2 = makeService({ id: 'ec2', dataStreams: ['ec2_logs'], inputs: ['aws-s3'] });
    const emr = makeService({ id: 'emr', dataStreams: ['emr_logs'], inputs: ['aws-s3'] });
    const stored: Record<string, ServiceVars> = {
      emr: { enabledDataStreams: [], varsByDataStream: {} },
    };

    expect(buildIacIntegrations([original(ec2), original(emr)], stored)).toEqual([
      { name: 'aws', policyTemplates: [{ name: 'ec2', enabledInputs: ['aws-s3'] }] },
    ]);
  });

  it('returns [] when every member is emptied or resolves to no inputs', () => {
    const emptied = makeService({ id: 'ec2', dataStreams: ['ec2_logs'], inputs: ['aws-s3'] });
    const noInputs = makeService({ id: 'bare', dataStreams: ['bare'], inputs: [] });

    expect(
      buildIacIntegrations([original(emptied), original(noInputs)], {
        ec2: { enabledDataStreams: [], varsByDataStream: {} },
      })
    ).toEqual([]);
  });

  it('uses policyTemplate over id when the entry aliases a manifest policy template', () => {
    const service = makeService({
      id: 'ec2_otel',
      policyTemplate: 'aws.ec2',
      packageName: 'aws_cloudwatch_input_otel',
      dataStreams: ['ec2_otel'],
      inputs: ['aws/metrics'],
    });

    expect(buildIacIntegrations([original(service)], {})).toEqual([
      {
        name: 'aws_cloudwatch_input_otel',
        policyTemplates: [{ name: 'aws.ec2', enabledInputs: ['aws/metrics'] }],
      },
    ]);
  });

  it('unions inputs when two services resolve to the same package and policy template', () => {
    const logs = makeService({
      id: 'ec2_logs_twin',
      policyTemplate: 'ec2',
      dataStreams: ['ec2_logs'],
      inputs: ['aws-s3'],
    });
    const metrics = makeService({
      id: 'ec2_metrics_twin',
      policyTemplate: 'ec2',
      dataStreams: ['ec2_metrics'],
      inputs: ['aws/metrics'],
    });

    expect(buildIacIntegrations([original(logs), original(metrics)], {})).toEqual([
      { name: 'aws', policyTemplates: [{ name: 'ec2', enabledInputs: ['aws-s3', 'aws/metrics'] }] },
    ]);
  });

  it('unions the inputs active across a multi-DS service and sorts them', () => {
    const service = makeMultiDsService();
    const stored: Record<string, ServiceVars> = {
      multi: {
        enabledDataStreams: ['ds_defaults', 'ds_inputs_only', 'ds_no_info'],
        varsByDataStream: {
          ds_no_info: { enabledInputs: ['httpjson', 'aws-s3'], varsByInput: {} },
        },
      },
    };

    // ds_defaults → manifest default (aws-cloudwatch); ds_inputs_only → first DS input (aws-s3);
    // ds_no_info → the user's explicit choice.
    expect(buildIacIntegrations([original(service)], stored)).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'multi', enabledInputs: ['aws-cloudwatch', 'aws-s3', 'httpjson'] },
        ],
      },
    ]);
  });

  describe('duplicate instances', () => {
    const cloudtrail = makeService({
      id: 'cloudtrail',
      dataStreams: ['cloudtrail'],
      inputs: ['aws-s3', 'aws-cloudwatch'],
    });

    it('reads vars by instance id so a duplicate with a different input is granted', () => {
      const stored: Record<string, ServiceVars> = {
        cloudtrail: {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: { cloudtrail: { enabledInputs: ['aws-s3'], varsByInput: {} } },
        },
        'cloudtrail__dup-1': {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: { cloudtrail: { enabledInputs: ['aws-cloudwatch'], varsByInput: {} } },
        },
      };

      expect(buildIacIntegrations([original(cloudtrail), duplicate(cloudtrail)], stored)).toEqual([
        {
          name: 'aws',
          policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-cloudwatch', 'aws-s3'] }],
        },
      ]);
    });

    it('keeps the service when the original is emptied but its duplicate is active', () => {
      const stored: Record<string, ServiceVars> = {
        cloudtrail: { enabledDataStreams: [], varsByDataStream: {} },
        'cloudtrail__dup-1': {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: { cloudtrail: { enabledInputs: ['aws-cloudwatch'], varsByInput: {} } },
        },
      };

      expect(buildIacIntegrations([original(cloudtrail), duplicate(cloudtrail)], stored)).toEqual([
        {
          name: 'aws',
          policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-cloudwatch'] }],
        },
      ]);
    });

    it('falls back to the service id for a duplicate whose vars predate instance keying', () => {
      const stored: Record<string, ServiceVars> = {
        cloudtrail: {
          enabledDataStreams: ['cloudtrail'],
          varsByDataStream: { cloudtrail: { enabledInputs: ['aws-s3'], varsByInput: {} } },
        },
      };

      expect(buildIacIntegrations([duplicate(cloudtrail)], stored)).toEqual([
        { name: 'aws', policyTemplates: [{ name: 'cloudtrail', enabledInputs: ['aws-s3'] }] },
      ]);
    });
  });

  it('is stable regardless of member order and unsorted manifest inputs', () => {
    const a = makeService({
      id: 'guardduty',
      dataStreams: ['guardduty'],
      inputs: ['httpjson', 'aws-s3'],
    });
    const b = makeService({ id: 'cloudtrail', dataStreams: ['cloudtrail'], inputs: ['aws-s3'] });

    const forward = buildIacIntegrations([original(a), original(b)], {});
    const reversed = buildIacIntegrations([original(b), original(a)], {});

    expect(forward).toEqual(reversed);
    expect(forward).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'cloudtrail', enabledInputs: ['aws-s3'] },
          { name: 'guardduty', enabledInputs: ['aws-s3', 'httpjson'] },
        ],
      },
    ]);
  });
});

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
