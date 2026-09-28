/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getS3FederatedIdentityManualSteps } from './federated_identity_s3_setup_content';

const steps = getS3FederatedIdentityManualSteps({
  jwtIssuer: 'https://workload-identity-issuer.example/orgs/org-abc123',
  subject: 'deployment:dep-xyz456',
});

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
