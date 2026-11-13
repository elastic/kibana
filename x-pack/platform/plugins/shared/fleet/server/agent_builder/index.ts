/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';

import { awsOnboardingSkill } from './skills/aws_onboarding_skill';

export const registerAwsOnboardingSkill = ({
  agentBuilder,
  workflowsManagement,
}: {
  agentBuilder: AgentBuilderPluginSetup;
  workflowsManagement: WorkflowsServerPluginSetup;
}) => {
  agentBuilder.skills.register(awsOnboardingSkill({ workflowApi: workflowsManagement.management }));
};
