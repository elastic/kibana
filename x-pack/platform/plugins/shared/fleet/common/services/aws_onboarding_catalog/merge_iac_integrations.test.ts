/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { diffIacIntegrations, mergeIacIntegrations } from './merge_iac_integrations';

describe('mergeIacIntegrations', () => {
  it('unions inputs per package and template and keeps the sort order', () => {
    const merged = mergeIacIntegrations(
      [
        { name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['httpjson'] }] },
        {
          name: 'cloud_security_posture',
          policyTemplates: [{ name: 'cspm', enabledInputs: ['x'] }],
        },
      ],
      [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'lambda', enabledInputs: ['aws/metrics'] },
            { name: 'guardduty', enabledInputs: ['aws-s3', 'httpjson'] },
          ],
        },
      ]
    );

    expect(merged).toEqual([
      {
        name: 'aws',
        policyTemplates: [
          { name: 'guardduty', enabledInputs: ['aws-s3', 'httpjson'] },
          { name: 'lambda', enabledInputs: ['aws/metrics'] },
        ],
      },
      { name: 'cloud_security_posture', policyTemplates: [{ name: 'cspm', enabledInputs: ['x'] }] },
    ]);
  });
});

describe('diffIacIntegrations', () => {
  it('lists only the templates and inputs the covered set lacks', () => {
    const added = diffIacIntegrations(
      [{ name: 'aws', policyTemplates: [{ name: 'guardduty', enabledInputs: ['aws-s3'] }] }],
      [
        {
          name: 'aws',
          policyTemplates: [
            { name: 'guardduty', enabledInputs: ['aws-s3', 'httpjson'] },
            { name: 'lambda', enabledInputs: ['aws/metrics'] },
          ],
        },
      ]
    );

    expect(added).toEqual(['guardduty (httpjson)', 'lambda (aws/metrics)']);
  });
});
