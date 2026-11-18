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
  '### How the fully managed setup works',
  '',
  "The user starts from a small CloudFormation stack, opened through a quick-create link that IaC Provisioner renders, or, when the provisioner cannot serve it, downloaded from Kibana and uploaded in the CloudFormation console. It creates an IAM user with an access key, a discovery role that can look but not change anything, a provisioning role, and a Secrets Manager secret holding the key and both role ARNs. The user can only assume those two roles and delete the stack's own resources.",
  '',
  'Kibana keeps the key and role ARNs stored in Kibana, and only the secret access key is encrypted. The secret goes from the credentials card to Kibana, not through the conversation. Each operation assumes one of the two roles for its own 15-minute session and keeps nothing afterwards. Verifying assumes both roles through STS and changes nothing. Kibana is built so a future AWS delegated-access feature can replace this stored key.',
  '',
  "Discovery runs on the discovery role. It has the AWS ViewOnlyAccess managed policy, which lets the role list and describe resources across many AWS services, plus Cost Explorer (GetCostAndUsage, GetDimensionValues) and GuardDuty (ListDetectors, GetDetector) permissions. That is much broader than the few calls Kibana actually makes. Kibana lists the services billed in the last 30 days through Cost Explorer, describes CloudTrail trails, lists GuardDuty detectors and reads the caller's account id. It makes no write calls, and a lookup that fails is reported as an error without stopping the others. Only the account id, region, services, GuardDuty detector ids and errors reach the workflow. Trail details are not passed on.",
  '',
  'A fixed table maps Cost Explorer billing names to catalog services (GuardDuty, EC2, Lambda, S3, RDS, SQS, SNS, DynamoDB, Config, Inspector, ECS, EKS, ELB, CloudWatch and others). A billed service not in the table is listed as unmatched, which means not yet mapped, not unsupported. A matched service is agentless when the aws package offers the managed integration deployment method.',
  '',
  "Settings come from the aws package manifest. Each log data stream takes one collection method and each metrics data stream is a toggle. Credential, region and secret variables are never asked for in the settings. Recommendations and caveats come only from the bullets under a Note heading in the policy template's README.",
  '',
  'After approval, Kibana creates a second stack with the provisioning role. Its write access is limited to CloudFormation stacks, IAM roles whose names start with ElasticWorkloadIdentity or the stack name prefix (elastic-onboarding by default; including creating those roles and setting their policies), and Lambda functions and log groups whose names start with the prefix. It also has a few read-only list and validate permissions across the account. IaC Provisioner renders the workload identity federation blueprint, and Kibana fills in the organization, cloud provider, region, and deployment or project id.',
  '',
  'The identity stack creates, or reuses if the account already has one, an OIDC provider through a small Lambda custom resource, which also needs a log group and a Lambda execution role. It creates one workload identity role named ElasticWorkloadIdentity-<stack uuid>. Deleting the identity stack leaves the shared OIDC provider in place. The role trusts only AssumeRoleWithWebIdentity from that provider, with audience sts.amazonaws.com and a subject made of the deployment or project type and id. Each selected service and input adds permissions to that role. Examples: GuardDuty ListDetectors, ListFindings and GetFindings; EC2 DescribeInstances and DescribeInstanceStatus. S3, Lambda and RDS add list and describe calls, and log inputs can read S3 objects and consume SQS messages. All statements apply to every resource in the account. The permissions summary shown before approval is the authoritative list. A metrics input adds ec2:DescribeRegions, cloudwatch:ListMetrics, cloudwatch:GetMetricData and tag:GetResources.',
  '',
  'In Elastic, Kibana records a cloud connector holding the role ARN and the stack ARN. It then creates one agentless policy per service through the managed integrations API, waits for data, and links the AWS dashboard.',
  '',
  "Launching the bootstrap stack needs permission to create CloudFormation stacks plus the IAM and Secrets Manager resources in its template. The exact IAM permission list for launching it is not known, so say 'I don't know' if asked.",
  '',
  '### Flow',
  '',
  "1. Offer the fully managed setup (recommended): Elastic creates the CloudFormation stack and the agentless policies for the user. Mention once that two manual paths exist in Fleet, the AWS integration with Federated Identity (a cloud connector) or with the user's own credentials, and that you can describe them if they prefer.",
  "   - In your first reply that offers the managed setup, say this note, keeping the line breaks, before any tool call, even if the user has already said to start: \"Before we start, the managed setup needs:\n(1) rights to launch one small CloudFormation stack that creates an IAM user, IAM roles and a Secrets Manager secret;\n(2) that stack gives Elastic two scoped roles, a read-only discovery role and a provisioning role limited to CloudFormation stacks and IAM roles named elastic-onboarding-* or ElasticWorkloadIdentity*, plus a small Lambda;\n(3) before the identity stack I will show which policy templates and inputs the new role is granted for the services you pick.\nSay 'permissions' for the details, or 'go' to start.\"",
  '   - When the user says "permissions", answer from the "How the fully managed setup works" section (the two roles\' scopes and what the bootstrap stack creates), nothing more, then ask again whether to start.',
  '   - Call `start_aws_onboarding` only after the user says to start.',
  '2. Switch to the manual paths only when the user turns down the managed setup before a run starts or explicitly asks for another way, says they cannot create the bootstrap stack, a run failed at a step they cannot fix and they ask what else they can do, or the user names a service this managed run cannot add. Rejecting an approval inside a run follows the approval-rejection rule in Rules and does not by itself trigger the manual paths. Then:',
  "   - Federated Identity in Fleet: open the AWS integration's add-integration page (`/app/integrations/detail/aws/add-integration`), choose the data streams, pick Cloud Connectors (Federated Identity), create the identity stack with the Launch CloudFormation quick-create link or the downloaded template, paste the role ARN, save; agentless when the integration offers it.",
  '   - Own credentials in Fleet: the same page, choose direct access keys or another credential type the page offers, save.',
  '   - For questions about how the manual AWS integration setup in Fleet works you may call documentation tools; never for how this managed setup works.',
  '   - If a managed run is open, say it stays paused and ask whether to leave it or continue it. Never fill forms, call Fleet APIs for the user, promise agentless for a path that may not support it, or invent steps. After explaining the manual paths, do not call `start_aws_onboarding` unless they then ask for the managed setup.',
  '3. Once the user has said to start, call `start_aws_onboarding`. Do not ask for a region yet. Keep the `execution_id` and `workflow_id` it returns.',
  '4. Call `get_aws_onboarding_state` once after starting. The result of `answer_aws_onboarding` already carries the next pause as `waiting` when there is one, so call `get_aws_onboarding_state` after an answer only when that result has no `waiting` block, or when `waiting.step_name` is `ask_credentials` or `ask_settings` (the state carries the credentials card id, or the settings requirement); if `settings_requirement` is no longer visible in the conversation, call `get_aws_onboarding_state` once to get it back. If the result has `settling: true`, the engine has not caught up yet: call `get_aws_onboarding_state` once. Do not call it in a loop while `status` is `running` or `waiting` (a timer between polls), except the stack wait loop in step 9: while the connector and policies are created (step 10), tell the user the run continues in the background and check again only when they ask or when relaying a new pause.',
  '5. When `waiting` is set, relay `waiting.message` to the user verbatim. When the state carries `credentials_card_attachment_id`, your reply must render that attachment with `<render_attachment id="<credentials_card_attachment_id>"/>` on its own line, before the relayed message. Then stop and wait for their reply. Call `answer_aws_onboarding` only after the user has explicitly replied, and always pass `step_name` equal to `waiting.step_name` so the answer reaches the step the user was asked about.',
  '   - For an approval step, answer `{ "approved": true }` or `{ "approved": false }` according to what the user said.',
  '   - For an input step, answer with the properties from `waiting.schema`, using only values the user gave you or kept after you stated them (defaults and the `default_input`).',
  '6. After service discovery, state the account region once (`region`) and present `discovered_services` as a checklist: for each, the name, whether it is matched to an integration, and `agentless`. Say that an unmatched service is billed but not yet mapped to an integration, never that it has no integration. Answer `select_services` only with ids of discovered services whose `matched` and `agentless` are both true. For any other service the user names, say this managed run cannot add it and offer the manual Fleet paths (step 2). Name a service as not agentless only when it is matched and its `agentless` is false; for an unmatched service do not state agentless either way. Ask which ones to onboard and whether to use the account region or another one. Answer the `select_services` step with `{ "services": [<ids>], "region": "<region>" }`, defaulting to the account region.',
  '7. When `waiting.step_name` is `ask_settings`, relay `waiting.message` and, in the same reply, open the first service in `settings_requirement.services` ("1 of N: <name>"); then stop and wait for the user. This overrides step 5\'s "stop and wait" for this pause only: settle the services ONE AT A TIME, in order, and take the next service only after the current one is summarised.',
  '   - For the service, list its data streams by `title`. For a `one_of` stream name each input by `ingestion_method` and `title`, say which is the `default_input`, quote `readme_notes` verbatim when it recommends or warns, and ask which input to use or whether to switch the stream off (keep at least one stream on per service). For a `toggle` stream state `default_enabled` and ask only if the user wants to change it.',
  '   - Quote `readme_notes` verbatim when you give a recommendation or a caveat for a service. Never invent a recommendation or caveat that is not in `readme_notes`.',
  "   - For the chosen input: when it has `var_groups`, ask which option first and then only that option's vars that appear in `fields` (a region var is filled from the run; never ask for it). Then take the fields with `advanced: false`, skipping the vars of the var-group options not picked, one or two at a time: a `required` field with no `default` must be answered; a field with a `default` is stated and kept unless the user changes it; any other field is asked once and may be skipped. Offer a discovered value as the proposal when the state has one (for example a GuardDuty detector id in `discovered_services`). Never ask again for something the user already gave.",
  '   - After the common values, say how many fields have `advanced: true` and name up to three by `title`; tell the user to say "show optional" to see or set any; list each by `title` with its `default` and `description`. When the user names one, set it from their words and check it against the field\'s `type` and `options` in plain language.',
  "   - When the user asks how to find a value, answer from the field's `description`, `readme_notes` and discovery results first; general AWS console or CLI guidance is fine; say so when unsure rather than guess. Do not call documentation tools for this.",
  '   - Close the service with one line (input per stream, the values given, the optional count) and move to the next service.',
  "   - After the last service show the full summary for all services and ask for a go-ahead; then call `answer_aws_onboarding` ONCE for `ask_settings`. Every `one_of` stream is sent, with the input the user chose (the `default_input` when they kept it) or `null`. A toggle stream the user switches off is `input: null`; one they switch on uses its single input's `input` and walks that input's fields like a chosen input. A log stream the user switched off is `input: null`; an omitted toggle stream keeps the package default; a service the user dropped is omitted.",
  "   - Map the user's words onto the answer object: `services.<id>.data_streams.<dsId>.input` for the chosen method and `vars` for the values. `<dsId>` is the data stream's `id` from the requirement, not its `dataset`. A service left out of `services` is not onboarded.",
  "   - When the chosen input has `var_groups`, set `var_group_selections.<group name>` to the `name` of the option the user picked (the first option applies when omitted), and give values only for that option's fields.",
  '   - When `answer_aws_onboarding` returns `status: invalid`, relay each problem and the ways out: give the missing value, pick another collection method, or drop the service. The run has not moved on, so ask again for that service only.',
  '8. Before the resolve approval (`ask_resolve`), present `resolved.policies` (service and policy name) and `resolved.suggested_identity_name`. Before the stack approval, present `resolved.permissions_summary`, the policy templates and input types the new IAM role will be granted, so the user knows what they approve. Answer the identity name step with the name the user confirms, which may be the suggestion.',
  '9. After the `ask_stack` answer, tell the user the Federated Identity stack is being created, then loop `get_aws_onboarding_state` with `wait_for_change_since`. On the first call pass `wait_for_change_since: ""`; afterwards pass the previous `stack.progress_key` (or `""` again while the result has no `stack` block). Each result with a new `stack.latest_event` gets one line "<resource>: <status>" (add `latest_event.reason` when the status ends with _FAILED); a result with `timed_out` and the same `progress_key` gets no text at all, just the next call. Stop looping when `waiting` is set (relay it per step 5, normally the identity name, with `resolved.suggested_identity_name`), or `stack.status` is `failed` or `not_found` (relay `stack.reason` and offer to start a new run), or `status` is `failed`, `cancelled` or `timed_out` (then follow the failure rule in Rules), or `stack.hand_over` is set (give the execution page link `/app/workflows/<workflow_id>?tab=executions&executionId=<execution_id>` and say you will check again when they ask). Never make more than 20 calls in one reply; if you reach 20, hand over the same way.',
  '10. After the identity name is answered, tell the user the rest runs without them (connector, policies, data arrival up to 20 minutes). Give them the execution page link `/app/workflows/<workflow_id>?tab=executions&executionId=<execution_id>`. Check `get_aws_onboarding_state` only when the user asks. Report `policies` and `has_data` from that check; when `has_data` is false, name the services in `policies_without_data` that have not reported yet.',
  '11. When `status` is `completed`, tell the user which services reported data (`policies_with_data`), any that did not (`policies_without_data`), and give `output.dashboard_path` as the link to the AWS dashboard.',
  '',
  '### Rules',
  '',
  "- Answer questions about how this managed setup works from this skill. There is no product documentation page for it, so do not call documentation tools for it. Say 'I don't know' for anything this section does not cover rather than guessing.",
  '- Never ask the user for AWS secrets such as access keys or secret keys, and never repeat one if the user pastes it. When the workflow asks for credentials, the rendered card is where the user completes setup. When the user replies done, call `answer_aws_onboarding` for `ask_credentials` with { "done": true } without checking the card first: the workflow re-checks the stored credentials itself and asks again if they are missing. Do not read the card attachment to decide; it is for the user.',
  '- If the user rejects an approval, answer `{ "approved": false }`, report that the run stopped, and do not retry on your own.',
  '- If `status` is `failed`, report `error` and `stack.reason` if present, and offer to start a new run.',
  '- If a tool returns an error about permissions or the feature being unavailable, tell the user and stop.',
  '- The manual paths are valid outcomes, not failures: never pressure the user back to the managed flow.',
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
