/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

import { createStartAwsOnboardingTool } from '../tools/start_aws_onboarding';
import { createGetAwsOnboardingStateTool } from '../tools/get_aws_onboarding_state';
import { createAnswerAwsOnboardingTool } from '../tools/answer_aws_onboarding';
import type { AwsOnboardingToolDeps } from '../tools/common';

const AWS_ONBOARDING_CONTENT = [
  '## AWS onboarding',
  '',
  'Use this skill to bring AWS data into Elastic with agentless integrations. A managed workflow does the work and pauses whenever it needs the user. You relay the pauses and never answer for the user.',
  '',
  '### Flow',
  '',
  '1. Offer the fully managed setup, where Elastic creates the CloudFormation stack and the agentless policies for the user. It is the only mode available, so do not offer a self-managed alternative.',
  '2. Ask which AWS region to use if the user has not said, then call `start_aws_onboarding` with it. Keep the `execution_id` and `workflow_id` it returns.',
  '3. Call `get_aws_onboarding_state` after starting and after every answer. If `status` is `running`, call it again until the run is waiting, completed or failed.',
  '4. When `waiting` is set, relay `waiting.message` to the user verbatim, then stop and wait for their reply. Call `answer_aws_onboarding` only after the user has explicitly replied.',
  '   - For an approval step, answer `{ "approved": true }` or `{ "approved": false }` according to what the user said.',
  '   - For an input step, answer with the properties from `waiting.schema`, using only values the user gave you.',
  '5. After service discovery, present `discovered_services` as a checklist with each service name, whether it is matched and agentless, and its region. Ask which ones to onboard. Answer the `select_services` step with `{ "services": [<ids>], "region": "<region>" }`.',
  '6. Before asking for approval of the settings, present `resolved.policies` (service and policy name) and `resolved.suggested_identity_name`. Answer the identity name step with the name the user confirms, which may be the suggestion.',
  '7. While the stack and policies are created, report `stack.status`, `policies` and `has_data`. Link the Workflows execution page so the user can follow progress: `/app/workflows/<workflow_id>?tab=executions&executionId=<execution_id>`.',
  '8. When `status` is `completed`, tell the user their data is arriving and give `output.dashboard_path` as the link to the AWS dashboard.',
  '',
  '### Rules',
  '',
  '- Never ask the user for AWS secrets such as access keys or secret keys, and never repeat one if the user pastes it. When the workflow asks for credentials, tell the user to enter them in the AWS onboarding credentials form in Kibana, then reply here when done.',
  '- If the user rejects an approval, answer `{ "approved": false }`, report that the run stopped, and do not retry on your own.',
  '- If `status` is `failed`, report `error` and `stack.reason` if present, and offer to start a new run.',
  '- If a tool returns an error about permissions or the feature being unavailable, tell the user and stop.',
].join('\n');

/**
 * Built-in skill that lets the main agent drive the managed AWS agentless onboarding
 * workflow, using three inline tools that start, inspect and resume the workflow run.
 */
export const awsOnboardingSkill = (deps: AwsOnboardingToolDeps) =>
  defineSkillType({
    id: 'fleet-aws-onboarding',
    name: 'fleet-aws-onboarding',
    basePath: 'skills/platform/fleet',
    description:
      'Use when the user wants to onboard AWS to Elastic: get AWS data into Elastic, set up an AWS integration such as GuardDuty, CloudTrail, VPC Flow Logs or S3, connect or onboard an AWS account, or collect AWS logs and metrics without running an agent.',
    content: AWS_ONBOARDING_CONTENT,
    getInlineTools: () => [
      createStartAwsOnboardingTool(deps),
      createGetAwsOnboardingStateTool(deps),
      createAnswerAwsOnboardingTool(deps),
    ],
  });
