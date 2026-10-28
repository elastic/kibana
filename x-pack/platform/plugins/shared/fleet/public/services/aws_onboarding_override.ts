/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Keep in sync with @kbn/ingest-hub-plugin/common/core/constants
export const ONBOARDING_ENABLED_FLAG = 'ingestHub.onboardingEnabled';
export const ONBOARDING_APP_ID = 'onboarding';
export const ONBOARDING_AWS_PATH = '/aws';

export const AWS_TITLE = i18n.translate('xpack.fleet.onboardingOverride.awsTitle', {
  defaultMessage: 'Amazon Web Services',
});

export const AWS_ONBOARDING_PACKAGE_NAME = 'aws';

// hiding tiles that are included in the AWS onboarding flow: https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/ingest_hub/public/onboarding/aws_service_matrix.ts#L188
export const HIDDEN_TILE_NAMES = new Set([
  'aws',
  'aws_bedrock',
  'aws_bedrock_agentcore',
  'aws_billing',
  'aws_cloudwatch_input_otel',
  'aws_logs',
  'aws_mq',
  'aws_securityhub',
  'amazon_security_lake',
  'awsfargate',
  'aws_cloudtrail_otel',
  'aws_ec2_otel',
  'aws_ecs_otel',
  'aws_elb_metrics_otel',
  'aws_elb_otel',
  'aws_lambda_otel',
  'aws_rds_otel',
  'aws_sqs_otel',
  'aws_vpcflow_otel',
  'aws_waf_otel',
]);
export const HIDDEN_TILE_IDS = new Set(['epr:aws']);

export const isHiddenByAwsOnboarding = (name: string, id?: string) =>
  HIDDEN_TILE_NAMES.has(name) || (id !== undefined && HIDDEN_TILE_IDS.has(id));

interface AwsMemberSource {
  id: string;
  name: string;
  title: string;
  integration?: string;
  type?: string;
}

// The services to name when a search matches the tile: one entry per title, only real services.
// OpenTelemetry and content packages are left out, they are variants or assets of those services.
// `aws` package policy templates come first so their titles win over any remaining duplicate.
export function getSearchMembers(
  hidden: AwsMemberSource[]
): Array<{ name: string; title: string }> {
  const sorted = [...hidden]
    .filter(
      (card) =>
        !HIDDEN_TILE_IDS.has(card.id) && !card.name.endsWith('_otel') && card.type !== 'content'
    )
    .sort(
      (a, b) =>
        Number(b.name === AWS_ONBOARDING_PACKAGE_NAME) -
        Number(a.name === AWS_ONBOARDING_PACKAGE_NAME)
    );
  const seen = new Set<string>();
  const members: Array<{ name: string; title: string }> = [];
  for (const card of sorted) {
    const key = card.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    members.push({ name: card.integration || card.name, title: card.title });
  }
  return members;
}
