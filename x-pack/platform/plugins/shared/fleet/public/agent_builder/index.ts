/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';

import { AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE } from '../../common/agent_builder/aws_onboarding_credentials_attachment';
import { AWS_ONBOARDING_RUN_ATTACHMENT_TYPE } from '../../common/agent_builder/aws_onboarding_run_attachment';
import type { FleetStartServices } from '../plugin';

import { createAwsOnboardingCredentialsAttachmentDefinition } from './attachments/aws_onboarding_credentials/definition';
import { createAwsOnboardingRunAttachmentDefinition } from './attachments/aws_onboarding_run/definition';

export const registerFleetAgentBuilderAttachments = ({
  attachments,
  startServices,
}: {
  attachments: AgentBuilderPluginStart['attachments'];
  startServices: FleetStartServices;
}): void => {
  attachments.addAttachmentType(
    AWS_ONBOARDING_CREDENTIALS_ATTACHMENT_TYPE,
    createAwsOnboardingCredentialsAttachmentDefinition(startServices)
  );
  attachments.addAttachmentType(
    AWS_ONBOARDING_RUN_ATTACHMENT_TYPE,
    createAwsOnboardingRunAttachmentDefinition()
  );
};
