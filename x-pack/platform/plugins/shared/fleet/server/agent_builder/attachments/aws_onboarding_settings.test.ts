/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE } from '../../../common/agent_builder/aws_onboarding_settings_attachment';
import type { AwsOnboardingSettingsRequirement } from '../../../common/workflows/steps/settings';

import { createAwsOnboardingSettingsAttachmentType } from './aws_onboarding_settings';

const requirement: AwsOnboardingSettingsRequirement = {
  package_name: 'aws',
  package_version: '8.18.1',
  region: 'us-east-1',
  services: [
    {
      id: 'guardduty',
      name: 'GuardDuty',
      policy_template: 'guardduty',
      data_streams: [
        {
          id: 'guardduty',
          dataset: 'aws.guardduty',
          type: 'logs',
          title: 'GuardDuty findings',
          choice: 'one_of',
          inputs: [
            {
              input: 'httpjson',
              ingestion_method: 'API',
              title: 'GuardDuty API',
              description: 'Poll the API',
              fields: [
                {
                  name: 'detector_id',
                  title: 'Detector ID',
                  type: 'text',
                  required: true,
                  advanced: false,
                },
              ],
              var_groups: [],
            },
          ],
        },
      ],
    },
  ],
};

describe('aws onboarding settings attachment type', () => {
  it('rejects extra keys', () => {
    const type = createAwsOnboardingSettingsAttachmentType();
    expect(type.validate({ execution_id: 'e1', requirement })).toMatchObject({ valid: true });
    expect(type.validate({ execution_id: 'e1', requirement, secret: 'x' })).toMatchObject({
      valid: false,
    });
  });

  it('formats a per-service summary without field values', async () => {
    const type = createAwsOnboardingSettingsAttachmentType();
    const formatted = await type.format(
      {
        id: 'a1',
        type: AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
        data: {
          execution_id: 'e1',
          requirement,
          answer: {
            services: {
              guardduty: {
                data_streams: {
                  guardduty: { input: 'httpjson', vars: { detector_id: 'SECRET-1' } },
                },
              },
            },
          },
          problems: [{ path: 'guardduty.guardduty.vars.x', message: 'bad' }],
        },
      } as any,
      {} as any
    );
    const { value } = formatted.getRepresentation!() as { value: string };
    expect(value).toContain('GuardDuty: aws.guardduty via httpjson');
    expect(value).toContain('1 problems');
    expect(value).not.toContain('SECRET-1');
  });
});
