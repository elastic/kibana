/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../../hooks';

import type { IntegrationCardItem } from '..';

// Keep in sync with @kbn/ingest-hub-plugin/common/core/constants
const ONBOARDING_ENABLED_FLAG = 'ingestHub.onboardingEnabled';
const ONBOARDING_APP_ID = 'onboarding';
const ONBOARDING_AWS_PATH = '/aws';
const AWS_TITLE = i18n.translate('xpack.fleet.onboardingOverride.awsTitle', {
  defaultMessage: 'Amazon Web Services',
});
const AWS_DESCRIPTION = i18n.translate('xpack.fleet.onboardingOverride.awsDescription', {
  defaultMessage: 'Collect logs and metrics from Amazon Web Services (AWS).',
});

export const AWS_ONBOARDING_PACKAGE_NAME = 'aws';

// hiding tiles that are included in the AWS onboarding flow: https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/ingest_hub/public/onboarding/aws_service_matrix.ts#L188
const HIDDEN_TILE_NAMES = new Set([
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
const HIDDEN_TILE_IDS = new Set(['epr:aws']);

// The services to name when a search matches the tile: one entry per title, only real services.
// OpenTelemetry and content packages are left out, they are variants or assets of those services.
// `aws` package policy templates come first so their titles win over any remaining duplicate.
function getSearchMembers(hidden: IntegrationCardItem[]): IntegrationCardItem['searchMembers'] {
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

export function useOnboardingOverride() {
  const { featureFlags, application } = useStartServices();
  const isOnboardingEnabled = featureFlags.useBooleanValue(ONBOARDING_ENABLED_FLAG, false);

  const onboardingUrl = useMemo(
    () => application.getUrlForApp(ONBOARDING_APP_ID, { path: ONBOARDING_AWS_PATH }),
    [application]
  );

  // `newSession` makes the onboarding app drop session storage left over from an earlier run.
  const navigateToOnboarding = useCallback(() => {
    application.navigateToApp(ONBOARDING_APP_ID, {
      path: ONBOARDING_AWS_PATH,
      state: { newSession: true },
    });
  }, [application]);

  const applyOnboardingOverride = useMemo(() => {
    return (cards: IntegrationCardItem[]): IntegrationCardItem[] => {
      if (!isOnboardingEnabled) {
        return cards;
      }

      const filtered: IntegrationCardItem[] = [];
      const hidden: IntegrationCardItem[] = [];
      for (const card of cards) {
        if (HIDDEN_TILE_NAMES.has(card.name) || HIDDEN_TILE_IDS.has(card.id)) {
          hidden.push(card);
        } else {
          filtered.push(card);
        }
      }

      // The hidden tiles are the services the onboarding flow covers. Index their text on the
      // onboarding tile so searching for a service still finds it.
      const members = getSearchMembers(hidden);
      const searchableContent = hidden
        .flatMap((card) => [card.integration, card.title, card.description])
        .filter(Boolean)
        .join(' ');
      const categories = [...new Set(['aws', ...hidden.flatMap((card) => card.categories)])];

      const onboardingAwsTile: IntegrationCardItem = {
        id: 'epr:aws',
        title: AWS_TITLE,
        description: AWS_DESCRIPTION,
        icons: [{ type: 'eui', src: 'logoAWS' }],
        url: onboardingUrl,
        integration: 'aws',
        name: 'aws-onboarding',
        version: '',
        categories,
        searchableContent,
        searchMembers: members,
        onCardClick: navigateToOnboarding,
      };

      return [onboardingAwsTile, ...filtered];
    };
  }, [isOnboardingEnabled, navigateToOnboarding, onboardingUrl]);

  return { applyOnboardingOverride, isOnboardingEnabled, navigateToOnboarding, onboardingUrl };
}
