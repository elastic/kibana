/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

import {
  AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
  awsOnboardingStackAttachmentDataSchema,
} from '../../../common/agent_builder/aws_onboarding_stack_attachment';
import type { AwsOnboardingStackAttachmentData } from '../../../common/agent_builder/aws_onboarding_stack_attachment';

export const createAwsOnboardingStackAttachmentType = (): AttachmentTypeDefinition<
  typeof AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
  AwsOnboardingStackAttachmentData
> => ({
  id: AWS_ONBOARDING_STACK_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parseResult = awsOnboardingStackAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { stack_name: stackName, action, execution_id: executionId } = attachment.data;
      return {
        type: 'text',
        value: `AWS onboarding identity stack ${stackName} (${action}, run ${executionId})`,
      };
    },
  }),
  getAgentDescription: () =>
    'An AWS onboarding identity stack attachment is a card that shows the user the live progress of the Federated Identity CloudFormation stack. ' +
    'The card reads the stack status in the browser; never read this attachment to decide anything. ' +
    'Use get_aws_onboarding_state for the run and stack status.',
  getTools: () => [],
});
