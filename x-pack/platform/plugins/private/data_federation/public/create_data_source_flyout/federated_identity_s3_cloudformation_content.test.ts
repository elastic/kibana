/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildS3CloudFormationLaunchUrl,
  getS3FederatedIdentityDeployConfig,
  isS3CloudFormationSetupAvailable,
} from './federated_identity_s3_setup_content';

const setupValues = {
  jwtIssuer: 'https://workload-identity-issuer.example/orgs/org-abc123',
  subject: 'deployment:dep-xyz456',
};

const launchUrl = buildS3CloudFormationLaunchUrl(setupValues);

const launchParams = (url: string) => new URLSearchParams(url.slice(url.indexOf('?') + 1));

describe('buildS3CloudFormationLaunchUrl', () => {
  it('opens the quick create stack form in the AWS console', () => {
    expect(
      launchUrl.startsWith(
        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?'
      )
    ).toBe(true);
    expect(launchParams(launchUrl).get('stackName')).toBe('elastic-data-federation');
  });

  // The console reads these from the query string, so they have to survive URL encoding intact:
  // the issuer carries slashes and the subject a colon.
  it('passes the issuer and subject as template parameters', () => {
    const params = launchParams(launchUrl);

    expect(params.get('param_JwtIssuer')).toBe(setupValues.jwtIssuer);
    expect(params.get('param_Subject')).toBe(setupValues.subject);
    expect(launchUrl).toContain('param_JwtIssuer=https%3A%2F%2F');
  });

  it('encodes values that would otherwise break the query string', () => {
    const url = buildS3CloudFormationLaunchUrl({
      jwtIssuer: 'https://issuer.example/orgs/org&name=x',
      subject: 'deployment:dep #1',
    });
    const params = launchParams(url);

    expect(params.get('param_JwtIssuer')).toBe('https://issuer.example/orgs/org&name=x');
    expect(params.get('param_Subject')).toBe('deployment:dep #1');
    expect(url).not.toMatch(/ /);
  });
});

describe('isS3CloudFormationSetupAvailable', () => {
  // The CloudFormation method is only offered once the template is published, so the gate has to
  // track the template URL the launch link is built from rather than being toggled on its own.
  it('mirrors whether a template URL is configured', () => {
    const templateUrl = launchParams(launchUrl).get('templateURL') ?? '';

    expect(isS3CloudFormationSetupAvailable()).toBe(templateUrl.length > 0);
  });
});

describe('getS3FederatedIdentityDeployConfig', () => {
  const config = getS3FederatedIdentityDeployConfig(setupValues);

  it('launches the template built for this deployment', () => {
    expect(config.launchUrl).toBe(launchUrl);
  });

  it('lists the resources the template creates', () => {
    expect(config.createsItems.map(({ id }) => id)).toEqual(['idp', 'role', 'policy']);

    for (const { label } of config.createsItems) {
      expect(label).not.toBe('');
    }
  });

  it('gives the panel a title, description and button label', () => {
    for (const text of [
      config.title,
      config.description,
      config.launchButtonLabel,
      config.createsTitle,
    ]) {
      expect(text).not.toBe('');
    }
  });
});
