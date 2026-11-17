/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AWS_SERVICES_STATIC,
  buildAwsServiceMatrix,
} from '../../../common/services/aws_onboarding_catalog';

import { isAgentless } from './aws_service_matrix';
import { BILLING_NAME_TO_SERVICE_ID } from './billing_name_map';

// Policy templates of the `aws` package that enable the agentless deployment mode.
const AGENTLESS_POLICY_TEMPLATES = [
  'awshealth',
  'billing',
  'cloudwatch',
  'config',
  'dynamodb',
  'ebs',
  'ec2',
  'ecs',
  'eks',
  'elb',
  'lambda',
  'natgateway',
  'firewall',
  'rds',
  's3',
  's3_storage_lens',
  'sns',
  'sqs',
  'transitgateway',
  'usage',
  'vpn',
  'redshift',
  'kinesis',
  'securityhub',
  'inspector',
  'guardduty',
];

const matrix = buildAwsServiceMatrix(
  {
    aws: {
      policy_templates: AGENTLESS_POLICY_TEMPLATES.map((name) => ({
        name,
        data_streams: [],
        deployment_modes: { agentless: { enabled: true } },
      })),
      data_streams: [],
    },
  } as unknown as Parameters<typeof buildAwsServiceMatrix>[0],
  AWS_SERVICES_STATIC
);

describe('BILLING_NAME_TO_SERVICE_ID', () => {
  it('maps every billing name to an agentless-capable catalog service, with unique names', () => {
    const names = Object.keys(BILLING_NAME_TO_SERVICE_ID);
    expect(new Set(names).size).toBe(names.length);

    for (const [name, id] of Object.entries(BILLING_NAME_TO_SERVICE_ID)) {
      const entry = matrix.find((candidate) => candidate.id === id);
      expect({ name, found: Boolean(entry) }).toEqual({ name, found: true });
      expect({ name, agentless: entry ? isAgentless(entry) : false }).toEqual({
        name,
        agentless: true,
      });
    }
  });
});
