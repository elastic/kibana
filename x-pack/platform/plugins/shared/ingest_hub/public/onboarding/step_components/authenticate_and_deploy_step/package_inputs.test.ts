/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import type { ServiceInstance, ServiceVars } from '../service_settings_step/use_service_settings';
import { buildDeployGroups } from './deploy_groups';
import {
  buildIacIntegrations,
  buildPackageInputs,
  buildStreamVars,
  toSOServiceVars,
} from './package_inputs';

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

describe('toSOServiceVars', () => {
  it('keeps each instance namespace so a resumed deployment restores it', () => {
    const serviceVars: Record<string, ServiceVars> = {
      ec2: { enabledDataStreams: ['ec2'], varsByDataStream: {}, namespace: 'prod' },
      'ec2__dup-1': { enabledDataStreams: ['ec2'], varsByDataStream: {}, namespace: 'staging' },
    };
    const servicesMap = new Map([['ec2', { id: 'ec2' } as AwsServiceMatrixEntry]]);

    const result = toSOServiceVars(serviceVars, servicesMap) as Record<string, ServiceVars>;

    expect(result.ec2.namespace).toBe('prod');
    expect(result['ec2__dup-1'].namespace).toBe('staging');
  });
});

describe('buildPackageInputs', () => {
  it('emits array defaults for multi fields when no user value is stored', () => {
    // Regression test: buildStreamVars previously only emitted bool/string manifest defaults.
    // A `tags` var with required:true, show_user:true, multi:true, default:['forwarded'] would
    // have its default silently omitted, causing pruneUnsatisfiedInputs to remove the entire
    // input and throw "No fully configured input ... missing aws-s3:tags".
    const service = makeService({
      id: 'aws_billing',
      packageName: 'aws_billing',
      dataStreams: ['billing'],
      inputs: ['aws-s3'],
      requiredConfig: ['tags'],
      varDefsByInput: {
        'aws-s3': {
          tags: {
            name: 'tags',
            type: 'text',
            required: true,
            show_user: true,
            multi: true,
            default: ['forwarded', 'aws-billing'],
          } as any,
        },
      },
      varDefsByDataStream: {
        billing: {
          inputs: ['aws-s3'],
          defaultEnabledInputs: ['aws-s3'],
          requiredConfig: ['tags'],
          varDefsByInput: {
            'aws-s3': {
              tags: {
                name: 'tags',
                type: 'text',
                required: true,
                show_user: true,
                multi: true,
                default: ['forwarded', 'aws-billing'],
              } as any,
            },
          },
        },
      },
    });

    const inputs = buildPackageInputs([service], {}, 'us-east-1');
    const streamVars = inputs['aws_billing-aws-s3']?.streams?.['aws_billing.billing']?.vars;

    expect(streamVars?.tags).toEqual(['forwarded', 'aws-billing']);
  });
});

describe('buildStreamVars — collect_s3_logs', () => {
  const def = (name: string, extra: object = {}) =>
    ({ name, type: 'text', title: name, show_user: true, ...extra } as any);
  const s3Service = makeService({
    inputs: ['aws-s3'],
    requiredConfig: ['bucket_arn'],
    optionalConfig: ['queue_url', 'collect_s3_logs'],
    varDefsByInput: {
      'aws-s3': {
        bucket_arn: def('bucket_arn'),
        queue_url: def('queue_url'),
        collect_s3_logs: def('collect_s3_logs', { type: 'bool', default: false }),
      },
    },
  });
  const dsVars = (vars: Record<string, string | string[]>) => ({
    enabledInputs: ['aws-s3'],
    varsByInput: { 'aws-s3': vars },
  });

  it('turns collect_s3_logs on when a bucket ARN is set and the toggle is untouched', () => {
    const out = buildStreamVars(s3Service, dsVars({ bucket_arn: 'arn:aws:s3:::b' }), '', 'aws-s3');
    expect(out.collect_s3_logs).toBe(true);
  });

  it('turns collect_s3_logs on for an access-point ARN alone', () => {
    const service = makeService({
      ...s3Service,
      varDefsByInput: {
        'aws-s3': {
          ...s3Service.varDefsByInput!['aws-s3'],
          access_point_arn: def('access_point_arn'),
        },
      },
    });
    const out = buildStreamVars(
      service,
      dsVars({ access_point_arn: 'arn:aws:s3:ap' }),
      '',
      'aws-s3'
    );
    expect(out.collect_s3_logs).toBe(true);
  });

  it('keeps an explicit collect_s3_logs choice', () => {
    const out = buildStreamVars(
      s3Service,
      dsVars({ bucket_arn: 'arn:aws:s3:::b', collect_s3_logs: 'false' }),
      '',
      'aws-s3'
    );
    expect(out.collect_s3_logs).toBe(false);
  });

  it('leaves the SQS default alone when no bucket ARN is set', () => {
    const out = buildStreamVars(s3Service, dsVars({ queue_url: 'https://sqs/q' }), '', 'aws-s3');
    expect(out.collect_s3_logs).toBe(false);
  });

  it('does not apply to ECF-scoped services', () => {
    const out = buildStreamVars(
      { ...s3Service, settingsScope: 'ecf' },
      dsVars({ bucket_arn: 'arn:aws:s3:::b' }),
      '',
      'aws-s3'
    );
    expect(out.collect_s3_logs).toBe(false);
  });
});
