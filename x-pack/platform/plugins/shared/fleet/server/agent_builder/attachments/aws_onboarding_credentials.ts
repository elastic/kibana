/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

import {
  AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  awsOnboardingCredentialsAttachmentDataSchema,
} from '../../../common/agent_builder/aws_onboarding_credentials_attachment';
import type { AwsOnboardingCredentialsAttachmentData } from '../../../common/agent_builder/aws_onboarding_credentials_attachment';

export const createAwsOnboardingCredentialsAttachmentType = (): AttachmentTypeDefinition<
  typeof AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  AwsOnboardingCredentialsAttachmentData
> => ({
  id: AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parseResult = awsOnboardingCredentialsAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { execution_id: executionId, status, account_id: accountId, error } = attachment.data;
      // The masked access key is left out on purpose: the agent only needs the status.
      let value = `AWS onboarding access (run ${executionId}): ${status}`;
      if (accountId) {
        value += `, account ${accountId}`;
      }
      if (status === 'verify_failed' && error) {
        value += `: ${error}`;
      }
      return { type: 'text', value };
    },
  }),
  getAgentDescription: () =>
    'An AWS onboarding access attachment is a card in which the user completes the AWS access setup for onboarding. ' +
    'The user enters and verifies their credentials inside the rendered card; never ask for, accept, or repeat AWS credentials in the conversation. ' +
    'Its status field tells whether setup is pending, configured, verified, or failed (verify_failed).',
  getTools: () => [],
});
