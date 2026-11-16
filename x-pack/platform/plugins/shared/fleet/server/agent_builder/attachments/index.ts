/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';

import { createAwsOnboardingCredentialsAttachmentType } from './aws_onboarding_credentials';
import { createAwsOnboardingSettingsAttachmentType } from './aws_onboarding_settings';

export { createAwsOnboardingCredentialsAttachmentType } from './aws_onboarding_credentials';
export { createAwsOnboardingSettingsAttachmentType } from './aws_onboarding_settings';

export const registerAwsOnboardingAttachments = ({
  agentBuilder,
}: {
  agentBuilder: AgentBuilderPluginSetup;
}) => {
  // registerType is declared on the default generics, so the specific definition needs a cast.
  agentBuilder.attachments.registerType(
    createAwsOnboardingCredentialsAttachmentType() as Parameters<
      typeof agentBuilder.attachments.registerType
    >[0]
  );
  agentBuilder.attachments.registerType(
    createAwsOnboardingSettingsAttachmentType() as Parameters<
      typeof agentBuilder.attachments.registerType
    >[0]
  );
};
