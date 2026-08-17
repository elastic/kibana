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
  ECF_UNIFIED_TEMPLATE_URL,
  ECF_OTEL_TEMPLATE_URL,
  ECF_CROWDSTRIKE_TEMPLATE_URL,
  ECF_UNIFIED_STACK_NAME,
  ECF_OTEL_STACK_NAME,
  ECF_CROWDSTRIKE_STACK_NAME,
} from './ecf_cloudformation';
import type { ServiceVars } from './step_components/service_settings_step/use_service_settings';

// ── getEcfServiceConfigs ───────────────────────────────────────────────────────

describe('getEcfServiceConfigs()', () => {
  it('returns empty array when no ECF services are selected', () => {
    // apigateway_logs has agent_based delivery — no ecfLogType
    const result = getEcfServiceConfigs(['apigateway_logs'], {});
    expect(result).toHaveLength(0);
  });

  it('returns a config for each selected ECF service', () => {
    const result = getEcfServiceConfigs(['vpcflow', 'cloudtrail'], {});
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.serviceId)).toEqual(['vpcflow', 'cloudtrail']);
    expect(result.map((c) => c.ecfLogType)).toEqual(['vpcflow', 'cloudtrail']);
  });

  it('reads bucket_arn and log_group_arn from serviceVars', () => {
    const serviceVars: Record<string, ServiceVars> = {
      vpcflow: {
        trigger: 'aws-s3',
        vars: { bucket_arn: 'arn:aws:s3:::my-bucket', region: 'us-east-1' },
      },
      waf: {
        trigger: 'aws-cloudwatch',
        vars: { log_group_arn: 'arn:aws:logs:us-east-1:123:log-group:waf' },
      },
    };
    const result = getEcfServiceConfigs(['vpcflow', 'waf'], serviceVars);

    const vpcConfig = result.find((c) => c.serviceId === 'vpcflow');
    expect(vpcConfig?.bucketArn).toBe('arn:aws:s3:::my-bucket');
    expect(vpcConfig?.logGroupArn).toBeUndefined();

    const wafConfig = result.find((c) => c.serviceId === 'waf');
    expect(wafConfig?.logGroupArn).toBe('arn:aws:logs:us-east-1:123:log-group:waf');
    expect(wafConfig?.bucketArn).toBeUndefined();
  });

  it('excludes stale ARN from the deselected transport when the user switches triggers', () => {
    // Simulate: user entered a bucket_arn on S3 trigger, then switched to CloudWatch and
    // entered a log_group_arn. Both values survive in vars due to merge-not-prune semantics.
    // Only the log_group_arn (matching the active trigger) should appear in the config.
    const serviceVars: Record<string, ServiceVars> = {
      cloudtrail: {
        trigger: 'aws-cloudwatch',
        vars: {
          bucket_arn: 'arn:aws:s3:::stale-bucket',
          log_group_arn: 'arn:aws:logs:us-east-1:123:log-group:ct',
        },
      },
    };
    const [config] = getEcfServiceConfigs(['cloudtrail'], serviceVars);
    expect(config.logGroupArn).toBe('arn:aws:logs:us-east-1:123:log-group:ct');
    expect(config.bucketArn).toBeUndefined();
  });

  it('trims whitespace from ARN values and treats blank as undefined', () => {
    const serviceVars: Record<string, ServiceVars> = {
      cloudtrail: { trigger: 'aws-s3', vars: { bucket_arn: '  ', log_group_arn: '' } },
    };
    const [config] = getEcfServiceConfigs(['cloudtrail'], serviceVars);
    expect(config.bucketArn).toBeUndefined();
    expect(config.logGroupArn).toBeUndefined();
  });

  it('skips non-ECF services mixed in with ECF services', () => {
    // ec2_logs has agent_based delivery — no ecfLogType; guardduty has ecfLogType
    const result = getEcfServiceConfigs(['ec2_logs', 'guardduty'], {});
    expect(result).toHaveLength(1);
    expect(result[0].serviceId).toBe('guardduty');
  });

  it('includes elb_logs with ecfLogType elbaccess', () => {
    const result = getEcfServiceConfigs(['elb_logs'], {});
    expect(result).toHaveLength(1);
    expect(result[0].ecfLogType).toBe('elbaccess');
  });
});

// ── buildEcfUnifiedCloudFormationUrl ──────────────────────────────────────────

describe('buildEcfUnifiedCloudFormationUrl()', () => {
  const baseConfigs = [
    { serviceId: 'vpcflow', ecfLogType: 'vpcflow' as const },
    {
      serviceId: 'cloudtrail',
      ecfLogType: 'cloudtrail' as const,
      bucketArn: 'arn:aws:s3:::ct-bucket',
    },
  ];

  it('uses the unified ECF template URL', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
    });
    expect(url).toContain(encodeURIComponent(ECF_UNIFIED_TEMPLATE_URL));
  });

  it('includes the default stack name', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
    });
    expect(url).toContain(`stackName=${ECF_UNIFIED_STACK_NAME}`);
  });

  it('pre-selects the AWS region via the ?region= query param', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'eu-west-1',
    });
    // The region goes before the hash (as a real query param)
    const [beforeHash] = url.split('#');
    expect(beforeHash).toContain('region=eu-west-1');
  });

  it('pre-fills OTLPEndpoint when provided', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      otlpEndpoint: 'https://otlp.example.com/v1',
    });
    expect(url).toContain(encodeURIComponent('https://otlp.example.com/v1'));
  });

  it('omits OTLPEndpoint when not provided', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
    });
    expect(url).not.toContain('param_OTLPEndpoint');
  });

  it('collects S3 bucket ARNs from configs', () => {
    const configs = [
      {
        serviceId: 'cloudtrail',
        ecfLogType: 'cloudtrail' as const,
        bucketArn: 'arn:aws:s3:::ct-bucket',
      },
      {
        serviceId: 'vpcflow',
        ecfLogType: 'vpcflow' as const,
        bucketArn: 'arn:aws:s3:::vpc-bucket',
      },
    ];
    const url = buildEcfUnifiedCloudFormationUrl({ ecfConfigs: configs, region: 'us-east-1' });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('arn:aws:s3:::ct-bucket');
    expect(hash).toContain('arn:aws:s3:::vpc-bucket');
  });

  it('appends :* to CloudWatch log group ARNs that lack it', () => {
    const configs = [
      {
        serviceId: 'waf',
        ecfLogType: 'waf' as const,
        logGroupArn: 'arn:aws:logs:us-east-1:123456789012:log-group:waf-logs',
      },
    ];
    const url = buildEcfUnifiedCloudFormationUrl({ ecfConfigs: configs, region: 'us-east-1' });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('arn:aws:logs:us-east-1:123456789012:log-group:waf-logs:*');
  });

  it('does not double-append :* to log group ARNs that already end with it', () => {
    const configs = [
      {
        serviceId: 'guardduty',
        ecfLogType: 'guardduty' as const,
        logGroupArn: 'arn:aws:logs:us-east-1:123456789012:log-group:gd-logs:*',
      },
    ];
    const url = buildEcfUnifiedCloudFormationUrl({ ecfConfigs: configs, region: 'us-east-1' });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).not.toContain(':*:*');
    expect(hash).toContain('arn:aws:logs:us-east-1:123456789012:log-group:gd-logs:*');
  });

  it('builds the comma-separated LogTypes param from service configs', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
    });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('param_LogTypes=vpcflow,cloudtrail');
  });

  it('produces a URL that opens the CloudFormation quick-create console', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
    });
    expect(url).toContain('console.aws.amazon.com/cloudformation/home');
    expect(url).toContain('/stacks/quickcreate');
  });

  it('does not include ElasticAPIKey in the URL', () => {
    const url = buildEcfUnifiedCloudFormationUrl({
      ecfConfigs: baseConfigs,
      region: 'us-east-1',
      otlpEndpoint: 'https://otlp.example.com',
    });
    expect(url).not.toContain('APIKey');
  });
});

// ── buildEcfOtelCloudFormationUrl ─────────────────────────────────────────────

describe('buildEcfOtelCloudFormationUrl()', () => {
  const otelConfigs = [
    {
      serviceId: 'vpcflow_otel',
      ecfLogType: 'vpcflow' as const,
      bucketArn: 'arn:aws:s3:::vpc-otel-bucket',
    },
    {
      serviceId: 'cloudtrail_otel',
      ecfLogType: 'cloudtrail' as const,
      bucketArn: 'arn:aws:s3:::ct-otel-bucket',
    },
  ];

  it('uses the OTel ECF template URL', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'us-east-1' });
    expect(url).toContain(encodeURIComponent(ECF_OTEL_TEMPLATE_URL));
  });

  it('includes the OTel stack name', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'us-east-1' });
    expect(url).toContain(`stackName=${ECF_OTEL_STACK_NAME}`);
  });

  it('uses S3SourceBuckets (not S3Buckets) for bucket ARNs', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'us-east-1' });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('param_S3SourceBuckets=');
    expect(hash).not.toContain('param_S3Buckets=');
    expect(hash).toContain('arn:aws:s3:::vpc-otel-bucket');
    expect(hash).toContain('arn:aws:s3:::ct-otel-bucket');
  });

  it('pre-selects the AWS region via the ?region= query param', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'eu-central-1' });
    const [beforeHash] = url.split('#');
    expect(beforeHash).toContain('region=eu-central-1');
  });

  it('pre-fills OTLPEndpoint when provided', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      otlpEndpoint: 'https://otlp.example.com/v1',
    });
    expect(url).toContain(encodeURIComponent('https://otlp.example.com/v1'));
  });

  it('omits OTLPEndpoint when not provided', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'us-east-1' });
    expect(url).not.toContain('param_OTLPEndpoint');
  });

  it('appends :* to CloudWatch log group ARNs that lack it', () => {
    const configs = [
      {
        serviceId: 'waf_otel',
        ecfLogType: 'waf' as const,
        logGroupArn: 'arn:aws:logs:us-east-1:123456789012:log-group:waf-otel',
      },
    ];
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: configs, region: 'us-east-1' });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('arn:aws:logs:us-east-1:123456789012:log-group:waf-otel:*');
  });

  it('builds the comma-separated LogTypes param from service configs', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'us-east-1' });
    const hash = decodeURIComponent(url.split('#')[1]);
    expect(hash).toContain('param_LogTypes=vpcflow,cloudtrail');
  });

  it('produces a URL that opens the CloudFormation quick-create console', () => {
    const url = buildEcfOtelCloudFormationUrl({ ecfConfigs: otelConfigs, region: 'us-east-1' });
    expect(url).toContain('console.aws.amazon.com/cloudformation/home');
    expect(url).toContain('/stacks/quickcreate');
  });

  it('does not include ElasticAPIKey in the URL', () => {
    const url = buildEcfOtelCloudFormationUrl({
      ecfConfigs: otelConfigs,
      region: 'us-east-1',
      otlpEndpoint: 'https://otlp.example.com',
    });
    expect(url).not.toContain('APIKey');
  });
});

// ── buildEcfCrowdstrikeCloudFormationUrl ──────────────────────────────────────

describe('buildEcfCrowdstrikeCloudFormationUrl()', () => {
  it('uses the CrowdStrike FDR template URL', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({ region: 'us-east-1' });
    expect(url).toContain(encodeURIComponent(ECF_CROWDSTRIKE_TEMPLATE_URL));
  });

  it('includes the CrowdStrike stack name', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({ region: 'us-east-1' });
    expect(url).toContain(`stackName=${ECF_CROWDSTRIKE_STACK_NAME}`);
  });

  it('pre-fills OTLPEndpoint when provided', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({
      region: 'us-east-1',
      otlpEndpoint: 'https://otlp.example.com',
    });
    expect(url).toContain(encodeURIComponent('https://otlp.example.com'));
  });

  it('does not include CrowdStrike-specific fields in the URL', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({ region: 'us-east-1' });
    // FeedClientID, FeedSecret, FeedSQSURL, FeedStorageRegion must be absent
    expect(url).not.toContain('FeedClientID');
    expect(url).not.toContain('FeedSecret');
    expect(url).not.toContain('FeedSQSURL');
  });

  it('produces a URL that opens the CloudFormation quick-create console', () => {
    const url = buildEcfCrowdstrikeCloudFormationUrl({ region: 'us-east-1' });
    expect(url).toContain('console.aws.amazon.com/cloudformation/home');
    expect(url).toContain('/stacks/quickcreate');
  });
});
