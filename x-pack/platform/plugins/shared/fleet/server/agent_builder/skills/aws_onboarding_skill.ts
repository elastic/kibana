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
  '2. Call `start_aws_onboarding`. Do not ask for a region yet. Keep the `execution_id` and `workflow_id` it returns.',
  '3. Call `get_aws_onboarding_state` once after starting. The result of `answer_aws_onboarding` already carries the next pause as `waiting` when there is one, so call `get_aws_onboarding_state` after an answer only when that result has no `waiting` block, or when `waiting.step_name` is `ask_credentials` or `ask_settings` (the state carries the credentials card id, or the settings requirement and card id). If the result has `settling: true`, the engine has not caught up yet: call `get_aws_onboarding_state` once. Do not call it again in a loop while `status` is `running`: while the stack and policies are created, tell the user the run continues in the background and check again only when they ask or when relaying a new pause.',
  '4. When `waiting` is set, relay `waiting.message` to the user verbatim. When the state carries `credentials_card_attachment_id`, your reply must render that attachment with `<render_attachment id="<credentials_card_attachment_id>"/>` on its own line, before the relayed message. Then stop and wait for their reply. Call `answer_aws_onboarding` only after the user has explicitly replied, and always pass `step_name` equal to `waiting.step_name` so the answer reaches the step the user was asked about.',
  '   - For an approval step, answer `{ "approved": true }` or `{ "approved": false }` according to what the user said.',
  '   - For an input step, answer with the properties from `waiting.schema`, using only values the user gave you.',
  '5. After service discovery, state the account region once (`region`) and present `discovered_services` as a checklist with each service name and whether it is matched and agentless. Ask which ones to onboard and whether to use the account region or another one. Answer the `select_services` step with `{ "services": [<ids>], "region": "<region>" }`, defaulting to the account region.',
  '6. When `waiting.step_name` is `ask_settings`, settle how each selected service is collected using `settings_requirement`, and render the settings attachment with `<render_attachment id="<settings_card_attachment_id>"/>` on its own line at this pause only.',
  "   - Explain each service's choice in plain words: name each data stream by its `title`, each input by its `ingestion_method` and `title`, and say which `default_input` applies when one is present.",
  '   - Quote `readme_notes` verbatim when you give a recommendation or a caveat for a service. Never invent a recommendation or caveat that is not in `readme_notes`.',
  '   - Ask only for what is missing: do not ask again for anything the user already gave or the requirement already defaults.',
  "   - Map the user's words onto the answer object: `services.<id>.data_streams.<dsId>.input` for the chosen method and `vars` for the values. A service left out of `services` is not onboarded.",
  '   - When `answer_aws_onboarding` returns `status: invalid`, relay each problem and the ways out: give the missing value, pick another collection method, or drop the service. The run has not moved on, so ask again.',
  '7. Before the settings approval, present `resolved.policies` (service and policy name) and `resolved.suggested_identity_name`. Before the stack approval, present `resolved.permissions_summary`, the policy templates and input types the new IAM role will be granted, so the user knows what they approve. Answer the identity name step with the name the user confirms, which may be the suggestion.',
  '8. After the identity name is answered, tell the user the run continues without them: the stack takes up to 15 minutes and data arrival up to 20 minutes. Give them the execution page link `/app/workflows/<workflow_id>?tab=executions&executionId=<execution_id>`. Check `get_aws_onboarding_state` only when the user asks. Report `stack.status`, `policies` and `has_data` from that check; when `has_data` is false, name the services in `policies_without_data` that have not reported yet.',
  '9. When `status` is `completed`, tell the user which services reported data (`policies_with_data`), any that did not (`policies_without_data`), and give `output.dashboard_path` as the link to the AWS dashboard.',
  '',
  '### Rules',
  '',
  '- Never ask the user for AWS secrets such as access keys or secret keys, and never repeat one if the user pastes it. When the workflow asks for credentials, the rendered card is where the user completes setup. When the user replies done, call `answer_aws_onboarding` for `ask_credentials` with { "done": true } without checking the card first: the workflow re-checks the stored credentials itself and asks again if they are missing. Do not read the card attachment to decide; it is for the user.',
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
      'Use when the user wants to onboard AWS to Elastic: get AWS data into Elastic, set up an agentless-capable AWS service such as GuardDuty, EC2 metrics, RDS or Lambda, connect or onboard an AWS account, or collect AWS logs and metrics without running an agent.',
    content: AWS_ONBOARDING_CONTENT,
    getInlineTools: () => [
      createStartAwsOnboardingTool(deps),
      createGetAwsOnboardingStateTool(deps),
      createAnswerAwsOnboardingTool(deps),
    ],
  });
