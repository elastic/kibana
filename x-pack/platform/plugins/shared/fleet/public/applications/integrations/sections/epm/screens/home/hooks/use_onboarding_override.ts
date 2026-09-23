/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { useLink, useStartServices } from '../../../../../hooks';

import type { IntegrationCardItem } from '..';

// Keep in sync with @kbn/ingest-hub-plugin/common/constants
const ONBOARDING_ENABLED_FLAG = 'ingestHub.onboardingEnabled';
const ONBOARDING_APP_ID = 'onboarding';
const ONBOARDING_AWS_PATH = '/aws';

export const AWS_ONBOARDING_PACKAGE_NAME = 'aws';
// Card id of the top-level aws package. Its policy templates are `epr:aws-<template>`.
const AWS_PACKAGE_TILE_ID = 'epr:aws';

// hiding tiles that are included in the AWS onboarding flow: https://github.com/elastic/kibana/blob/main/x-pack/platform/plugins/shared/ingest_hub/public/onboarding/aws_service_matrix.ts#L188
const HIDDEN_TILE_NAMES = new Set([
  'aws',
  'aws_bedrock',
  'aws_bedrock_agentcore',
  'aws_cloudwatch_input_otel',
  'aws_logs',
  'aws_mq',
  'awsfargate',
  'awsfirehose',
  'aws_securityhub',
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

export function useOnboardingOverride() {
  const { featureFlags, application } = useStartServices();
  const { getHref } = useLink();
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

      return cards.reduce<IntegrationCardItem[]>((kept, card) => {
        if (card.id === AWS_PACKAGE_TILE_ID) {
          // Pinned to the overview page so `enableIntegrationTileClickToAdd` cannot send the
          // tile past the detail page, which is where the handover to onboarding lives.
          kept.push({
            ...card,
            url: getHref('integration_details_overview', {
              pkgkey: `${card.name}-${card.version}`,
              ...(card.integration ? { integration: card.integration } : {}),
            }),
          });
        } else if (!HIDDEN_TILE_NAMES.has(card.name)) {
          kept.push(card);
        }
        return kept;
      }, []);
    };
  }, [isOnboardingEnabled, getHref]);

  return { applyOnboardingOverride, isOnboardingEnabled, navigateToOnboarding, onboardingUrl };
}
