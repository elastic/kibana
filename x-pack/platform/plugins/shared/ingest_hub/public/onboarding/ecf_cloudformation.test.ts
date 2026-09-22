/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getEcfServiceConfigs,
  buildEcfUnifiedCloudFormationUrl,
  buildEcfOtelCloudFormationUrl,
  buildEcfCrowdstrikeCloudFormationUrl,
  ECF_UNIFIED_TEMPLATE_FILE,
  ECF_OTEL_TEMPLATE_FILE,
  ECF_CROWDSTRIKE_TEMPLATE_FILE,
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from './ecf_cloudformation';
import {
  buildEcfTemplateUrl,
  ECF_FALLBACK_TEMPLATE_VERSION,
} from '../../common/ecf_template_version';
import type {
  ServiceInstance,
  ServiceVars,
} from './step_components/service_settings_step/use_service_settings';

/** Build a minimal ServiceInstance for tests. Non-duplicate by default. */
const inst = (serviceId: string, instanceId = serviceId): ServiceInstance => ({
  instanceId,
  serviceId,
  name: serviceId,
  isDuplicate: instanceId !== serviceId,
});

// ── getEcfServiceConfigs ───────────────────────────────────────────────────────

describe('getEcfServiceConfigs()', () => {
  it('returns empty array when no ECF services are selected', () => {
    // apigateway_logs has agent_based delivery — no ecfLogType
    const result = getEcfServiceConfigs([inst('apigateway_logs')], {});
    expect(result).toHaveLength(0);
  });

  it('returns a config for each selected ECF service', () => {
    const result = getEcfServiceConfigs([inst('vpcflow'), inst('cloudtrail')], {});
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.serviceId)).toEqual(['vpcflow', 'cloudtrail']);
    expect(result.map((c) => c.ecfLogType)).toEqual(['vpcflow', 'cloudtrail']);
  });

  it('reads bucket_arn and log_group_arn from serviceVars keyed by instanceId', () => {
    const serviceVars: Record<string, ServiceVars> = {
      vpcflow: {
        enabledDataStreams: ['vpcflow'],
        varsByDataStream: {
          vpcflow: {
            enabledInputs: ['aws-s3'],
            varsByInput: {
              'aws-s3': { bucket_arn: 'arn:aws:s3:::my-bucket', region: 'us-east-1' },
            },
          },
        },
      },
      waf: {
        enabledDataStreams: ['waf'],
        varsByDataStream: {
          waf: {
            enabledInputs: ['aws-cloudwatch'],
            varsByInput: {
              'aws-cloudwatch': { log_group_arn: 'arn:aws:logs:us-east-1:123:log-group:waf' },
            },
          },
        },
      },
    };
    const result = getEcfServiceConfigs([inst('vpcflow'), inst('waf')], serviceVars);

    const vpcConfig = result.find((c) => c.serviceId === 'vpcflow');
    expect(vpcConfig?.bucketArns).toEqual(['arn:aws:s3:::my-bucket']);
    expect(vpcConfig?.logGroupArns).toEqual([]);

    const wafConfig = result.find((c) => c.serviceId === 'waf');
    expect(wafConfig?.logGroupArns).toEqual(['arn:aws:logs:us-east-1:123:log-group:waf']);
    expect(wafConfig?.bucketArns).toEqual([]);
  });

  it('collects ARNs from duplicate instances into a single config entry', () => {
    // User duplicated cloudtrail to collect from two S3 buckets.
    const serviceVars: Record<string, ServiceVars> = {
      cloudtrail: {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: {
          cloudtrail: {
            enabledInputs: ['aws-s3'],
            varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::bucket-a' } },
          },
        },
      },
      'cloudtrail__dup-1': {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: {
          cloudtrail: {
            enabledInputs: ['aws-s3'],
            varsByInput: { 'aws-s3': { bucket_arn: 'arn:aws:s3:::bucket-b' } },
          },
        },
      },
    };
    const instances = [inst('cloudtrail'), inst('cloudtrail', 'cloudtrail__dup-1')];
    const [config] = getEcfServiceConfigs(instances, serviceVars);

    expect(config.serviceId).toBe('cloudtrail');
    expect(config.bucketArns).toEqual(['arn:aws:s3:::bucket-a', 'arn:aws:s3:::bucket-b']);
    expect(config.logGroupArns).toEqual([]);
  });

  it('excludes stale ARN from the deselected transport when the user switches triggers', () => {
    const serviceVars: Record<string, ServiceVars> = {
      cloudtrail: {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: {
          cloudtrail: {
            enabledInputs: ['aws-cloudwatch'],
            varsByInput: {
              'aws-s3': { bucket_arn: 'arn:aws:s3:::stale-bucket' },
              'aws-cloudwatch': { log_group_arn: 'arn:aws:logs:us-east-1:123:log-group:ct' },
            },
          },
        },
      },
    };
    const [config] = getEcfServiceConfigs([inst('cloudtrail')], serviceVars);
    expect(config.logGroupArns).toEqual(['arn:aws:logs:us-east-1:123:log-group:ct']);
    expect(config.bucketArns).toEqual([]);
  });

  it('trims whitespace from ARN values and treats blank as empty', () => {
    const serviceVars: Record<string, ServiceVars> = {
      cloudtrail: {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: {
          cloudtrail: {
            enabledInputs: ['aws-s3'],
            varsByInput: {
              'aws-s3': { bucket_arn: '  ' },
              'aws-cloudwatch': { log_group_arn: '' },
            },
          },
        },
      },
    };
    const [config] = getEcfServiceConfigs([inst('cloudtrail')], serviceVars);
    expect(config.bucketArns).toEqual([]);
    expect(config.logGroupArns).toEqual([]);
  });

  it('splits comma-joined multi-value ARNs into individual entries', () => {
    const serviceVars: Record<string, ServiceVars> = {
      cloudtrail: {
        enabledDataStreams: ['cloudtrail'],
        varsByDataStream: {
          cloudtrail: {
            enabledInputs: ['aws-s3', 'aws-cloudwatch'],
            varsByInput: {
              'aws-s3': { bucket_arn: 'arn:aws:s3:::bucket-a, arn:aws:s3:::bucket-b' },
              'aws-cloudwatch': {
                log_group_arn:
                  'arn:aws:logs:us-east-1:123:log-group:ct-1, arn:aws:logs:us-east-1:123:log-group:ct-2',
              },
            },
          },
        },
      },
    };
    const [config] = getEcfServiceConfigs([inst('cloudtrail')], serviceVars);
    expect(config.bucketArns).toEqual(['arn:aws:s3:::bucket-a', 'arn:aws:s3:::bucket-b']);
    expect(config.logGroupArns).toEqual([
      'arn:aws:logs:us-east-1:123:log-group:ct-1',
      'arn:aws:logs:us-east-1:123:log-group:ct-2',
    ]);
  });

  it('skips non-ECF services mixed in with ECF services', () => {
    // ec2_logs has agent_based delivery — no ecfLogType
    const result = getEcfServiceConfigs([inst('ec2_logs'), inst('vpcflow')], {});
    expect(result).toHaveLength(1);
    expect(result[0].serviceId).toBe('vpcflow');
  });
});

// ── buildEcfUnifiedCloudFormationUrl ──────────────────────────────────────────

describe('buildEcfUnifiedCloudFormationUrl()', () => {
  const TEST_VERSION = '1.10.0';
  const baseConfigs = [
    { serviceId: 'vpcflow', ecfLogType: 'vpcflow' as const, bucketArns: [], logGroupArns: [] },
    {
      serviceId: 'cloudtrail',
      ecfLogType: 'cloudtrail' as const,
      bucketArns: ['arn:aws:s3:::ct-bucket'],
      logGroupArns: [],
    },
  ];

  it('uses a version-pinned template URL (v1/v{version}/, not v1/latest/)', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain(
      encodeURIComponent(buildEcfTemplateUrl(ECF_UNIFIED_TEMPLATE_FILE, TEST_VERSION))
    );
    expect(url).not.toContain('latest');
  });

  it('falls back to ECF_FALLBACK_TEMPLATE_VERSION when version is omitted', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
    });
    expect(url).toContain(`v1%2Fv${ECF_FALLBACK_TEMPLATE_VERSION}`);
  });

  it('includes the default stack name', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain(`stackName=${ECF_UNIFIED_STACK_NAME}`);
  });

  it('uses a custom stackName when provided', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
      stackName: 'my-custom-stack',
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('stackName=my-custom-stack');
    // The default stack name must NOT appear as the stackName param (it may appear in the
    // templateURL host, which is why we check the hash params rather than the whole URL).
    expect(hash).not.toContain(`stackName=${ECF_UNIFIED_STACK_NAME}`);
  });

  it('pre-selects the AWS region via the ?region= query param', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'eu-west-1',
      version: TEST_VERSION,
    });
    const [beforeHash] = url.split('#');
    expect(beforeHash).toContain('region=eu-west-1');
  });

  it('pre-fills OTLPEndpoint when provided', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
      otlpEndpoint: 'https://otlp.example.com/v1',
    });
    expect(url).toContain(encodeURIComponent('https://otlp.example.com/v1'));
  });

  it('omits OTLPEndpoint when not provided', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).not.toContain('param_OTLPEndpoint');
  });

  it('appends :* to CloudWatch log group ARNs that lack it', () => {
    const configs = [
      {
        serviceId: 'waf',
        ecfLogType: 'waf' as const,
        bucketArns: [],
        logGroupArns: ['arn:aws:logs:us-east-1:123456789012:log-group:waf-logs'],
      },
    ];
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: configs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('arn:aws:logs:us-east-1:123456789012:log-group:waf-logs:*');
  });

  it('does not double-append :* to log group ARNs that already end with it', () => {
    const configs = [
      {
        serviceId: 'vpcflow',
        ecfLogType: 'vpcflow' as const,
        bucketArns: [],
        logGroupArns: ['arn:aws:logs:us-east-1:123456789012:log-group:vpc-logs:*'],
      },
    ];
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: configs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).not.toContain(':*:*');
  });

  it('builds the comma-separated LogTypes param from service configs', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('param_LogTypes=vpcflow,cloudtrail');
  });

  it('produces a URL that opens the CloudFormation quick-create console', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain('console.aws.amazon.com/cloudformation/home');
    expect(url).toContain('/stacks/quickcreate');
  });

  it('does not include ElasticAPIKey in the URL', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
      otlpEndpoint: 'https://otlp.example.com',
    });
    expect(url).not.toContain('APIKey');
  });
});

// ── buildEcfOtelCloudFormationUrl ─────────────────────────────────────────────

describe('buildEcfOtelCloudFormationUrl()', () => {
  const TEST_VERSION = '1.10.0';
  const otelConfigs = [
    {
      serviceId: 'vpcflow_otel',
      ecfLogType: 'vpcflow' as const,
      bucketArns: ['arn:aws:s3:::vpc-otel-bucket'],
      logGroupArns: [],
    },
    {
      serviceId: 'cloudtrail_otel',
      ecfLogType: 'cloudtrail' as const,
      bucketArns: ['arn:aws:s3:::ct-otel-bucket'],
      logGroupArns: [],
    },
  ];

  it('uses a version-pinned OTel template URL', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain(
      encodeURIComponent(buildEcfTemplateUrl(ECF_OTEL_TEMPLATE_FILE, TEST_VERSION))
    );
    expect(url).not.toContain('latest');
  });

  it('includes the OTel stack name by default', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain(`stackName=${ECF_OTEL_STACK_NAME}`);
  });

  it('uses a custom stackName when provided', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
      stackName: 'my-otel-stack',
    });
    expect(url).toContain('stackName=my-otel-stack');
  });

  it('uses S3SourceBuckets (not S3Buckets) for bucket ARNs', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('param_S3SourceBuckets=');
    expect(hash).not.toContain('param_S3Buckets=');
  });

  it('builds the comma-separated LogTypes param from service configs', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('param_LogTypes=vpcflow,cloudtrail');
  });

  it('does not include ElasticAPIKey in the URL', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      version: TEST_VERSION,
      otlpEndpoint: 'https://otlp.example.com',
    });
    expect(url).not.toContain('APIKey');
  });
});

// ── buildEcfCrowdstrikeCloudFormationUrl ──────────────────────────────────────

describe('buildEcfCrowdstrikeCloudFormationUrl()', () => {
  const TEST_VERSION = '1.10.0';

  it('uses a version-pinned CrowdStrike template URL', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain(
      encodeURIComponent(buildEcfTemplateUrl(ECF_CROWDSTRIKE_TEMPLATE_FILE, TEST_VERSION))
    );
    expect(url).not.toContain('latest');
  });

  it('includes the CrowdStrike stack name by default', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain(`stackName=${ECF_CROWDSTRIKE_STACK_NAME}`);
  });

  it('uses a custom stackName when provided', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      version: TEST_VERSION,
      stackName: 'custom-cs-stack',
    });
    expect(url).toContain('stackName=custom-cs-stack');
  });

  it('pre-fills OTLPEndpoint when provided', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      version: TEST_VERSION,
      otlpEndpoint: 'https://otlp.example.com',
    });
    expect(url).toContain(encodeURIComponent('https://otlp.example.com'));
  });

  it('does not include CrowdStrike-specific fields in the URL', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).not.toContain('FeedClientID');
    expect(url).not.toContain('FeedSecret');
    expect(url).not.toContain('FeedSQSURL');
  });

  it('produces a URL that opens the CloudFormation quick-create console', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      version: TEST_VERSION,
    });
    expect(url).toContain('console.aws.amazon.com/cloudformation/home');
    expect(url).toContain('/stacks/quickcreate');
  });
});
