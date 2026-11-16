/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';

import { createAwsOnboardingCredentialsAttachmentType } from './aws_onboarding_credentials';

export { createAwsOnboardingCredentialsAttachmentType } from './aws_onboarding_credentials';

export const registerAwsOnboardingAttachments = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}) => {
  agentBuilder.attachments.registerType(createAwsOnboardingCredentialsAttachmentType());
};
