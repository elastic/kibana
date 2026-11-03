/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import { test } from '../fixtures';
import {
  mockAwsPackage,
  navigateToOnboardingStep,
  useOnboardingFeatureFlag,
} from '../helpers/onboarding';

// The "at least one source" rule for services without an ECF route (managed integration view).
// The package marks every source var optional, so the flyout has to enforce it:
// ec2 (DS: ec2_logs): aws-cloudwatch needs one of log_group_arn / log_group_name / log_group_name_prefix
// guardduty (DS: guardduty): aws-s3 needs bucket_arn with collect_s3_logs on, queue_url with it off

const BUCKET_ARN_HELP_TEXT = "Mandatory if the 'Collect logs via S3 Bucket' switch is on.";

const optionalText = (name: string, title: string, extra: Record<string, unknown> = {}) => ({
  name,
  type: 'text',
  title,
  multi: false,
  required: false,
  show_user: true,
  ...extra,
});

const MOCK_AWS_PACKAGE_RESPONSE = {
  item: {
    policy_templates: [
      {
        name: 'ec2',
        title: 'Amazon EC2',
        data_streams: ['ec2_logs'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-cloudwatch' }],
      },
      {
        name: 'guardduty',
        title: 'Amazon GuardDuty',
        data_streams: ['guardduty'],
        deployment_modes: { agentless: { enabled: true } },
        inputs: [{ type: 'aws-s3' }],
      },
    ],
    data_streams: [
      {
        path: 'ec2_logs',
        type: 'logs',
        title: 'Amazon EC2 logs',
        streams: [
          {
            input: 'aws-cloudwatch',
            vars: [
              optionalText('log_group_arn', 'Log Group ARN'),
              optionalText('log_group_name', 'Log Group Name', { show_user: false }),
              optionalText('log_group_name_prefix', 'Log Group Name Prefix', { show_user: false }),
            ],
          },
        ],
      },
      {
        path: 'guardduty',
        type: 'logs',
        title: 'Amazon GuardDuty',
        streams: [
          {
            input: 'aws-s3',
            vars: [
              {
                name: 'collect_s3_logs',
                type: 'bool',
                title: 'Collect logs via S3 Bucket',
                required: true,
                show_user: true,
                default: false,
              },
              optionalText('bucket_arn', 'Bucket ARN', { description: BUCKET_ARN_HELP_TEXT }),
              optionalText('queue_url', 'Queue URL'),
            ],
          },
        ],
      },
    ],
  },
};

const ec2Vars = (varsByInput: Record<string, string>) => ({
  ec2: {
    enabledDataStreams: ['ec2_logs'],
    varsByDataStream: {
      ec2_logs: {
        enabledInputs: ['aws-cloudwatch'],
        varsByInput: { 'aws-cloudwatch': varsByInput },
      },
    },
  },
});

const guarddutyVars = (varsByInput: Record<string, string>) => ({
  guardduty: {
    enabledDataStreams: ['guardduty'],
    varsByDataStream: {
      guardduty: { enabledInputs: ['aws-s3'], varsByInput: { 'aws-s3': varsByInput } },
    },
  },
});

const field = (page: ScoutPage, input: string, fieldName: string) =>
  page.testSubj.locator(`serviceSettingsFlyout-${input}-field-${fieldName}`);

test.describe(
  'Onboarding Service Settings step — at least one source',
  { tag: tags.stateful.classic },
  () => {
    useOnboardingFeatureFlag();

    test.beforeEach(async ({ page }) => {
      await mockAwsPackage(page, MOCK_AWS_PACKAGE_RESPONSE);
    });

    test('CloudWatch logs input without a log group blocks Continue until one is set', async ({
      browserAuth,
      page,
    }) => {
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['ec2'],
        serviceVars: ec2Vars({}),
      });

      await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-ec2')).toBeVisible();
      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

      await page.testSubj.locator('serviceSettingsStep-editButton-ec2').click();
      await expect(page.testSubj.locator('serviceSettingsFlyout-sourceRequiredHint')).toHaveText(
        'Provide at least one of: Log Group ARN, Log Group Name, Log Group Name Prefix.'
      );
      await expect(page.testSubj.locator('serviceSettingsFlyout-saveButton')).toBeDisabled();

      // The agent-based view keeps the manifest definition: optional, single-value.
      const logGroupArn = field(page, 'aws-cloudwatch', 'log_group_arn');
      await expect(logGroupArn.getByText('Optional')).toBeVisible();
      await expect(logGroupArn.getByText('Add row')).toBeHidden();

      await logGroupArn
        .getByRole('textbox')
        .fill('arn:aws:logs:us-east-1:123456789012:log-group:ec2');
      await expect(page.testSubj.locator('serviceSettingsFlyout-sourceRequiredHint')).toBeHidden();
      await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

      await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-ec2')).toBeHidden();
      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
    });

    test('a log group name prefix satisfies the CloudWatch source rule', async ({
      browserAuth,
      page,
    }) => {
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['ec2'],
        serviceVars: ec2Vars({ log_group_name_prefix: '/aws/ec2' }),
      });

      await expect(page.testSubj.locator('serviceSettingsStep-attentionIcon-ec2')).toBeHidden();
      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
    });

    test('S3 toggle on requires a bucket ARN and keeps the manifest help text', async ({
      browserAuth,
      page,
    }) => {
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['guardduty'],
        serviceVars: guarddutyVars({ collect_s3_logs: 'true' }),
      });

      await expect(
        page.testSubj.locator('serviceSettingsStep-attentionIcon-guardduty')
      ).toBeVisible();
      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeDisabled();

      await page.testSubj.locator('serviceSettingsStep-editButton-guardduty').click();
      await expect(page.testSubj.locator('serviceSettingsFlyout-sourceRequiredHint')).toHaveText(
        'Provide at least one of: Bucket ARN.'
      );

      const bucketArn = field(page, 'aws-s3', 'bucket_arn');
      await expect(bucketArn.getByText(BUCKET_ARN_HELP_TEXT)).toBeVisible();
      await expect(bucketArn.getByText('Add row')).toBeHidden();

      await bucketArn.getByRole('textbox').fill('arn:aws:s3:::guardduty-findings');
      await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

      await expect(
        page.testSubj.locator('serviceSettingsStep-attentionIcon-guardduty')
      ).toBeHidden();
      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
    });

    test('S3 toggle off requires a queue URL instead of the bucket ARN', async ({
      browserAuth,
      page,
    }) => {
      await navigateToOnboardingStep(browserAuth, page, 'service-settings', {
        selectedServiceIds: ['guardduty'],
        serviceVars: guarddutyVars({
          collect_s3_logs: 'true',
          bucket_arn: 'arn:aws:s3:::guardduty-findings',
        }),
      });

      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();

      await page.testSubj.locator('serviceSettingsStep-editButton-guardduty').click();
      await expect(page.testSubj.locator('serviceSettingsFlyout-sourceRequiredHint')).toBeHidden();

      await field(page, 'aws-s3', 'collect_s3_logs').getByRole('switch').click();
      await expect(page.testSubj.locator('serviceSettingsFlyout-sourceRequiredHint')).toHaveText(
        'Provide at least one of: Queue URL.'
      );
      await expect(page.testSubj.locator('serviceSettingsFlyout-saveButton')).toBeDisabled();

      await field(page, 'aws-s3', 'queue_url')
        .getByRole('textbox')
        .fill('https://sqs.us-east-1.amazonaws.com/123456789012/guardduty');
      await expect(page.testSubj.locator('serviceSettingsFlyout-sourceRequiredHint')).toBeHidden();
      await page.testSubj.locator('serviceSettingsFlyout-saveButton').click();

      await expect(page.testSubj.locator('serviceSettingsStep-continueButton')).toBeEnabled();
    });
  }
);
