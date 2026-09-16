/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';

import { getIacRenderIntegrations } from './iac_render_integrations';

const guardduty = {
  id: 'guardduty',
  packageName: 'aws',
  dataStreams: ['guardduty'],
  inputs: ['aws-s3', 'httpjson'],
  identityFederationSupported: true,
} as AwsServiceMatrixEntry;

const inspector = {
  id: 'inspector',
  packageName: 'aws',
  dataStreams: ['inspector'],
  inputs: ['httpjson'],
  identityFederationSupported: true,
} as AwsServiceMatrixEntry;

const securityhub = {
  id: 'aws_securityhub',
  packageName: 'aws_securityhub',
  dataStreams: ['aws_securityhub'],
  inputs: ['aws-s3'],
  identityFederationSupported: true,
} as AwsServiceMatrixEntry;

describe('getIacRenderIntegrations', () => {
  it('groups selected managed services by package and unions enabled inputs', () => {
    const result = getIacRenderIntegrations(
      ['guardduty', 'inspector', 'aws_securityhub'],
      new Map([
        ['guardduty', guardduty],
        ['inspector', inspector],
        ['aws_securityhub', securityhub],
      ]),
      {
        guardduty: {
          enabledDataStreams: ['guardduty'],
          varsByDataStream: {
            guardduty: { enabledInputs: ['httpjson', 'aws-s3'], varsByInput: {} },
          },
        },
      }
    );

    expect(result).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'guardduty', enabledInputs: ['httpjson', 'aws-s3'] },
          { name: 'inspector', enabledInputs: ['httpjson'] },
        ],
      },
      {
        name: 'aws_securityhub',
        policyTemplates: [{ name: 'aws_securityhub', enabledInputs: ['aws-s3'] }],
      },
    ]);
  });

  it('skips services that do not support identity federation', () => {
    const result = getIacRenderIntegrations(
      ['config'],
      new Map([
        [
          'config',
          {
            id: 'config',
            packageName: 'aws',
            dataStreams: ['config'],
            inputs: ['httpjson'],
            identityFederationSupported: false,
          } as AwsServiceMatrixEntry,
        ],
      ]),
      {}
    );

    expect(result).toEqual([]);
  });
});
