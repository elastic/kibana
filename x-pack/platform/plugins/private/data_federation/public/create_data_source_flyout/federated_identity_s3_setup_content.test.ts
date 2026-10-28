/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildS3CloudFormationLaunchUrl,
  getS3FederatedIdentityDeployConfig,
  getS3FederatedIdentityManualSteps,
} from './federated_identity_s3_setup_content';

const setupValues = {
  jwtIssuer: 'https://workload-identity-issuer.example/orgs/org-abc123',
  subject: 'deployment:dep-xyz456',
};

const steps = getS3FederatedIdentityManualSteps(setupValues);

const stepById = (id: string) => {
  const step = steps.find((candidate) => candidate.id === id);

  if (!step) {
    throw new Error(`No manual setup step with id "${id}"`);
  }

  return step;
};

describe('getS3FederatedIdentityManualSteps', () => {
  it('fills in the issuer URL and subject of this deployment', () => {
    const { command } = stepById('create-idp');

    expect(command).toContain(
      "export JWT_ISSUER='https://workload-identity-issuer.example/orgs/org-abc123'"
    );
    expect(command).toContain("export SUBJECT='deployment:dep-xyz456'");
  });

  it('quotes the interpolated values so the shell cannot expand them', () => {
    const { command } = getS3FederatedIdentityManualSteps({
      jwtIssuer: 'https://issuer.example/$(whoami)/`id`/"quoted"',
      subject: "deployment:it's-me",
    })[0];

    expect(command).toContain(
      `export JWT_ISSUER='https://issuer.example/$(whoami)/\`id\`/"quoted"'`
    );
    expect(command).toContain(`export SUBJECT='deployment:it'\\''s-me'`);
  });

  it('leaves the bucket, policy and role names as placeholders for the user', () => {
    expect(stepById('create-policy').command).toContain('export BUCKET_NAME="<your-bucket-name>"');
    expect(stepById('create-policy').command).toContain('export POLICY_NAME="<your-policy-name>"');
    expect(stepById('create-role').command).toContain('export ROLE_NAME="<your-role-name>"');
  });

  // The audience the provider registers has to be the one the trust policy asserts, otherwise
  // setup looks fine and only fails at query time inside AssumeRoleWithWebIdentity.
  it('registers the same audience the trust policy asserts', () => {
    expect(stepById('create-idp').command).toContain('--client-id-list "sts.amazonaws.com"');
    expect(stepById('create-role').command).toContain('"${ISSUER_HOST}:aud": "sts.amazonaws.com"');
  });

  it('derives the issuer host that the trust policy conditions need', () => {
    expect(stepById('create-idp').command).toContain('ISSUER_HOST="${JWT_ISSUER#https://}"');
    expect(stepById('create-role').command).toContain('${ISSUER_HOST}');
  });

  // The first step lets users with an existing provider skip only the create command, so the
  // SUBJECT the trust policy needs must be exported by that step, not by the create command.
  it('restricts the trust policy to the provider and subject of this deployment', () => {
    const { command } = stepById('create-role');

    expect(command).toContain('"Federated": "${PROVIDER_ARN}"');
    expect(command).toContain('"${ISSUER_HOST}:sub": "${SUBJECT}"');
    expect(stepById('create-idp').command).toContain('export SUBJECT=');
  });

  // The names must not be hardcoded: the bucket annotation tells users to repeat these steps
  // per bucket, which only works if every created resource can be given a new name.
  it('never hardcodes the names of the resources it creates', () => {
    expect(stepById('create-policy').command).toContain('--policy-name "${POLICY_NAME}"');
    expect(stepById('create-role').command).toContain('--role-name "${ROLE_NAME}"');
  });

  // The annotated line numbers are hardcoded, so they silently drift if a command is edited.
  it.each([
    ['create-idp', { 1: 'JWT_ISSUER', 2: 'SUBJECT' }],
    ['create-policy', { 1: 'BUCKET_NAME', 2: 'POLICY_NAME' }],
    ['create-role', { 1: 'ROLE_NAME' }],
  ])('annotates the lines that hold the editable values of %s', (id, expectedVariableByLine) => {
    const { command, lineNumbers } = stepById(id);
    const commandLines = command.split('\n');

    expect(lineNumbers.highlight).toBe(Object.keys(expectedVariableByLine).join(', '));

    for (const [line, variable] of Object.entries(expectedVariableByLine)) {
      expect(commandLines[Number(line) - 1]).toContain(variable);
      expect(lineNumbers.annotations[Number(line)]).toBeTruthy();
    }
  });

  it('ends by printing the role ARN the user has to paste back', () => {
    const lastStep = steps[steps.length - 1];

    expect(lastStep.id).toBe('create-role');
    expect(lastStep.command).toContain('echo "${ROLE_ARN}"');
  });

  it('attaches the policy created earlier to the role', () => {
    expect(stepById('create-role').command).toContain('--policy-arn "${POLICY_ARN}"');
    expect(stepById('create-policy').command).toContain("--query 'Policy.Arn'");
  });
});

const deployValues = {
  ...setupValues,
  templateUrl: 'https://cft.s3.us-east-1.amazonaws.com/aws/v1/datasource-cft.yml',
};

const launchUrl = buildS3CloudFormationLaunchUrl(deployValues);

const launchParams = (url: string) => new URLSearchParams(url.slice(url.indexOf('?') + 1));

describe('buildS3CloudFormationLaunchUrl', () => {
  it('opens the quick create stack form in the AWS console', () => {
    expect(
      launchUrl.startsWith(
        'https://console.aws.amazon.com/cloudformation/home#/stacks/quickcreate?'
      )
    ).toBe(true);
  });

  // Each deployment or project needs its own stack, so a fixed name would collide.
  it('names the stack after the deployment or project', () => {
    expect(launchParams(launchUrl).get('stackName')).toBe(
      'elastic-datasources-federated-identity-dep-xyz456'
    );
  });

  it('points the console at the configured template', () => {
    expect(launchParams(launchUrl).get('templateURL')).toBe(deployValues.templateUrl);
  });

  // The template takes the resource type and ID as separate parameters, not the trust subject.
  it('passes the issuer and the resource type and ID as template parameters', () => {
    const params = launchParams(launchUrl);

    expect(params.get('param_JwtIssuerUrl')).toBe(setupValues.jwtIssuer);
    expect(params.get('param_ElasticResourceType')).toBe('deployment');
    expect(params.get('param_ElasticResourceId')).toBe('dep-xyz456');
    expect(launchUrl).toContain('param_JwtIssuerUrl=https%3A%2F%2F');
  });

  it('passes project as the resource type for serverless projects', () => {
    const params = launchParams(
      buildS3CloudFormationLaunchUrl({ ...deployValues, subject: 'project:proj789' })
    );

    expect(params.get('param_ElasticResourceType')).toBe('project');
    expect(params.get('param_ElasticResourceId')).toBe('proj789');
  });

  // Asserts on the raw string (not by parsing it back) so it cannot pass just because
  // building and parsing share the same URLSearchParams behavior.
  it('encodes values that would otherwise break the parameter list', () => {
    const url = buildS3CloudFormationLaunchUrl({
      ...deployValues,
      jwtIssuer: 'https://issuer.example/orgs/org&name=x',
    });

    expect(url).toContain(
      'param_JwtIssuerUrl=https%3A%2F%2Fissuer.example%2Forgs%2Forg%26name%3Dx'
    );
  });
});

describe('getS3FederatedIdentityDeployConfig', () => {
  const config = getS3FederatedIdentityDeployConfig(deployValues);

  it('launches the template built for this deployment', () => {
    expect(config.launchUrl).toBe(launchUrl);
  });

  it('lists the resources the template creates', () => {
    expect(config.createsItems.map(({ id }) => id)).toEqual(['idp', 'role']);

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
