/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

import {
  AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
  awsOnboardingRunAttachmentDataSchema,
} from '../../../common/agent_builder/aws_onboarding_run_attachment';
import type { AwsOnboardingRunAttachmentData } from '../../../common/agent_builder/aws_onboarding_run_attachment';

export const createAwsOnboardingRunAttachmentType = (): AttachmentTypeDefinition<
  typeof AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
  AwsOnboardingRunAttachmentData
> => ({
  id: AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parseResult = awsOnboardingRunAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const {
        execution_id: executionId,
        stack_action: stackAction,
        for_services: forServices,
      } = attachment.data;
      return {
        type: 'text',
        value: `AWS onboarding run ${executionId}: ${stackAction} identity, services ${forServices.join(
          ', '
        )}`,
      };
    },
  }),
  getAgentDescription: () =>
    'An AWS onboarding run attachment is a card that shows the user the live progress of the run, from the identity stack to data arriving. ' +
    'The card reads the progress in the browser; never read this attachment to decide anything. ' +
    'Use get_aws_onboarding_state for the run status.',
  getTools: () => [],
});
