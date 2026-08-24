/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPolicyGroupForIntegration, ISOLATED_CLOUD_CONNECTOR_PACKAGES } from './cloud_connector';

describe('getPolicyGroupForIntegration', () => {
  it('returns the isolated group for registered isolated packages', () => {
    expect(getPolicyGroupForIntegration('cloud_security_posture', 'aws')).toBe(
      'security_audit_policy_group'
    );
    expect(getPolicyGroupForIntegration('cloud_asset_inventory', 'aws')).toBe(
      'security_audit_policy_group'
    );
  });

  it('returns the isolated group regardless of provider', () => {
    expect(getPolicyGroupForIntegration('cloud_security_posture', 'azure')).toBe(
      'security_audit_policy_group'
    );
    expect(getPolicyGroupForIntegration('cloud_security_posture', 'gcp')).toBe(
      'security_audit_policy_group'
    );
  });

  it('returns the provider-default group for any other package', () => {
    expect(getPolicyGroupForIntegration('aws', 'aws')).toBe('aws_default');
    expect(getPolicyGroupForIntegration('aws_securityhub', 'aws')).toBe('aws_default');
    expect(getPolicyGroupForIntegration('aws_bedrock', 'aws')).toBe('aws_default');
    expect(getPolicyGroupForIntegration('some_future_fi_package', 'aws')).toBe('aws_default');
    expect(getPolicyGroupForIntegration('azure_billing', 'azure')).toBe('azure_default');
    expect(getPolicyGroupForIntegration('gcp_audit', 'gcp')).toBe('gcp_default');
  });

  it('never returns undefined — every integration resolves to a group', () => {
    expect(getPolicyGroupForIntegration('', 'aws')).toBeDefined();
    expect(getPolicyGroupForIntegration('unregistered_package', 'gcp')).toBeDefined();
  });

  it('does not resolve Object.prototype members as isolated groups', () => {
    expect(getPolicyGroupForIntegration('constructor', 'aws')).toBe('aws_default');
    expect(getPolicyGroupForIntegration('toString', 'aws')).toBe('aws_default');
    expect(getPolicyGroupForIntegration('hasOwnProperty', 'gcp')).toBe('gcp_default');
  });

  it('separates isolated packages from provider-default packages on the same provider', () => {
    const cspmGroup = getPolicyGroupForIntegration('cloud_security_posture', 'aws');
    const awsGroup = getPolicyGroupForIntegration('aws', 'aws');
    expect(cspmGroup).not.toBe(awsGroup);
  });

  it('shares a group across different provider-default packages on the same provider', () => {
    expect(getPolicyGroupForIntegration('aws', 'aws')).toBe(
      getPolicyGroupForIntegration('aws_securityhub', 'aws')
    );
  });

  it('does not share groups across providers', () => {
    expect(getPolicyGroupForIntegration('some_package', 'aws')).not.toBe(
      getPolicyGroupForIntegration('some_package', 'azure')
    );
  });
});

describe('ISOLATED_CLOUD_CONNECTOR_PACKAGES', () => {
  it('contains exactly the packages with bespoke IaC templates and permission scopes', () => {
    expect(Object.keys(ISOLATED_CLOUD_CONNECTOR_PACKAGES).sort()).toEqual([
      'cloud_asset_inventory',
      'cloud_security_posture',
    ]);
  });
});
