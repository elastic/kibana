/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getRegionFieldName,
  getRequiredTextFields,
  getInlineFields,
  getFlyoutFields,
} from './field_config';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

function makeService(overrides: Partial<AwsServiceMatrixEntry> = {}): AwsServiceMatrixEntry {
  return {
    id: 'test',
    name: 'Test Service',
    category: 'Compute',
    signalType: 'logs',
    inputs: [],
    deliveryMethods: [],
    showInUI: true,
    ...overrides,
  } as AwsServiceMatrixEntry;
}

describe('getRegionFieldName', () => {
  it('returns "region" for S3 transport when service has region in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['region', 'bucket_arn'] });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('region');
  });

  it('returns "region_name" for CloudWatch transport when service has region_name in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['region_name', 'log_group_arn'] });
    expect(getRegionFieldName(service, 'aws-cloudwatch')).toBe('region_name');
  });

  it('returns "aws_region" when service has aws_region in requiredConfig', () => {
    const service = makeService({ requiredConfig: ['aws_region'] });
    expect(getRegionFieldName(service, null)).toBe('aws_region');
  });

  it('falls back to "aws_region" when no matching region field exists', () => {
    const service = makeService({ requiredConfig: [] });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('aws_region');
  });

  it('does not return "region" for S3 when service lacks it in requiredConfig', () => {
    // service only has aws_region, not region
    const service = makeService({ requiredConfig: ['aws_region'] });
    expect(getRegionFieldName(service, 'aws-s3')).toBe('aws_region');
  });
});

describe('getRequiredTextFields', () => {
  it('returns bucket_arn for S3 transport', () => {
    const service = makeService({ requiredConfig: ['bucket_arn', 'region'] });
    expect(getRequiredTextFields(service, 'aws-s3')).toEqual(['bucket_arn']);
  });

  it('returns log_group_arn for CloudWatch transport', () => {
    const service = makeService({ requiredConfig: ['log_group_arn', 'region_name'] });
    expect(getRequiredTextFields(service, 'aws-cloudwatch')).toEqual(['log_group_arn']);
  });

  it('excludes region fields (they have a global fallback)', () => {
    const service = makeService({ requiredConfig: ['region', 'bucket_arn'] });
    const result = getRequiredTextFields(service, 'aws-s3');
    expect(result).not.toContain('region');
    expect(result).not.toContain('region_name');
    expect(result).not.toContain('aws_region');
  });

  it('excludes fields whose transport does not match the active transport', () => {
    // bucket_arn is transport: aws-s3; when active transport is cloudwatch it should be excluded
    const service = makeService({ requiredConfig: ['bucket_arn', 'log_group_arn'] });
    const result = getRequiredTextFields(service, 'aws-cloudwatch');
    expect(result).not.toContain('bucket_arn');
    expect(result).toContain('log_group_arn');
  });

  it('returns detector_id (no transport restriction) regardless of active transport', () => {
    const service = makeService({ requiredConfig: ['detector_id'] });
    expect(getRequiredTextFields(service, 'aws-s3')).toContain('detector_id');
    expect(getRequiredTextFields(service, 'aws-cloudwatch')).toContain('detector_id');
    expect(getRequiredTextFields(service, null)).toContain('detector_id');
  });

  it('returns empty array when service has no requiredConfig', () => {
    const service = makeService({ requiredConfig: [] });
    expect(getRequiredTextFields(service, null)).toEqual([]);
  });
});

describe('getInlineFields', () => {
  it('returns empty array — all fields have been moved to flyout placement', () => {
    // bucket_arn, log_group_arn, detector_id all now have placement: flyout
    const service = makeService({ requiredConfig: ['bucket_arn', 'log_group_arn', 'detector_id'] });
    expect(getInlineFields(service, 'aws-s3')).toEqual([]);
    expect(getInlineFields(service, 'aws-cloudwatch')).toEqual([]);
  });
});

describe('getFlyoutFields', () => {
  it('includes region field for S3 transport', () => {
    const service = makeService({ requiredConfig: ['region', 'bucket_arn'] });
    expect(getFlyoutFields(service, 'aws-s3')).toContain('region');
  });

  it('includes bucket_arn for S3 (now flyout-placed)', () => {
    const service = makeService({ requiredConfig: ['bucket_arn'] });
    expect(getFlyoutFields(service, 'aws-s3')).toContain('bucket_arn');
  });

  it('excludes S3-specific fields when CloudWatch is active', () => {
    const service = makeService({ requiredConfig: ['bucket_arn', 'log_group_arn'] });
    const result = getFlyoutFields(service, 'aws-cloudwatch');
    expect(result).not.toContain('bucket_arn');
    expect(result).toContain('log_group_arn');
  });
});
