/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentTypeDefinition } from '@kbn/agent-builder-server/attachments';

import {
  AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
  awsOnboardingSettingsAttachmentDataSchema,
} from '../../../common/agent_builder/aws_onboarding_settings_attachment';
import type { AwsOnboardingSettingsAttachmentData } from '../../../common/agent_builder/aws_onboarding_settings_attachment';

export const createAwsOnboardingSettingsAttachmentType = (): AttachmentTypeDefinition<
  typeof AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
  AwsOnboardingSettingsAttachmentData
> => ({
  id: AWS_ONBOARDING_SETTINGS_ATTACHMENT_TYPE,
  isReadonly: true,
  validate: (input) => {
    const parseResult = awsOnboardingSettingsAttachmentDataSchema.safeParse(input);
    if (parseResult.success) {
      return { valid: true, data: parseResult.data };
    }
    return { valid: false, error: parseResult.error.message };
  },
  format: (attachment) => ({
    getRepresentation: () => {
      const { execution_id: executionId, requirement, answer, problems } = attachment.data;
      // Field values are left out on purpose: the agent only needs the chosen method per stream.
      const lines = requirement.services.map((service) => {
        const answered = answer?.services[service.id]?.data_streams;
        const streams = service.data_streams.map((stream) => {
          const chosen = answered?.[stream.id];
          const via = chosen === undefined ? 'not set' : chosen.input ?? 'off';
          return `${stream.dataset} via ${via}`;
        });
        return `${service.name}: ${streams.join('; ')}`;
      });
      const problemCount = problems?.length ?? 0;
      const summary = [
        `AWS onboarding settings (run ${executionId})`,
        ...lines,
        ...(problemCount > 0 ? [`${problemCount} problems`] : []),
      ];
      return { type: 'text', value: summary.join('\n') };
    },
  }),
  getAgentDescription: () =>
    'An AWS onboarding settings attachment is a card showing, per selected AWS service, the collection method and required values for the onboarding run. ' +
    'Its answer and problems fields hold the latest settings received and what is still wrong with them.',
  getTools: () => [],
});
