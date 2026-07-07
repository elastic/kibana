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

// Keep in sync with @kbn/ingest-hub-plugin/common/constants
const ONBOARDING_ENABLED_FLAG = 'ingestHub.onboardingEnabled';
const AWS_TITLE = i18n.translate('xpack.fleet.onboardingOverride.awsTitle', {
  defaultMessage: 'Amazon Web Services',
});
const AWS_DESCRIPTION = i18n.translate('xpack.fleet.onboardingOverride.awsDescription', {
  defaultMessage: 'Collect logs and metrics from Amazon Web Services (AWS).',
});

const HIDDEN_TILE_NAMES = new Set(['aws']);
const HIDDEN_TILE_IDS = new Set(['epr:aws']);

export function useOnboardingOverride() {
  const { featureFlags, application } = useStartServices();
  const isOnboardingEnabled = featureFlags.getBooleanValue(ONBOARDING_ENABLED_FLAG, false);

  const navigateToOnboarding = useCallback(() => {
    application.navigateToApp('onboarding', { path: '/aws' });
  }, [application]);

  const applyOnboardingOverride = useMemo(() => {
    return (cards: IntegrationCardItem[]): IntegrationCardItem[] => {
      if (!isOnboardingEnabled) {
        return cards;
      }

      const filtered = cards.filter(
        (card) => !HIDDEN_TILE_NAMES.has(card.name) && !HIDDEN_TILE_IDS.has(card.id)
      );

      const onboardingAwsTile: IntegrationCardItem = {
        id: 'epr:aws',
        title: AWS_TITLE,
        description: AWS_DESCRIPTION,
        icons: [{ type: 'eui', src: 'logoAWS' }],
        url: application.getUrlForApp('onboarding', { path: '/aws' }),
        integration: 'aws',
        name: 'aws-onboarding',
        version: '',
        categories: ['aws'],
        onCardClick: navigateToOnboarding,
      };

      return [onboardingAwsTile, ...filtered];
    };
  }, [isOnboardingEnabled, navigateToOnboarding, application]);

  return { applyOnboardingOverride, isOnboardingEnabled };
}
