/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { useStartServices } from '../../../../../hooks';

import type { IntegrationCardItem } from '..';

// Flag key from @kbn/ingest-hub-plugin common/constants
const ONBOARDING_ENABLED_FLAG = 'ingestHub.onboardingEnabled';

const HIDDEN_TILE_NAMES = new Set(['aws', 'awsfirehose']);
const HIDDEN_TILE_IDS = new Set(['ui_link:esf']);

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
        id: 'onboarding:aws',
        title: 'Amazon Web Services',
        description: 'Collect logs and metrics from AWS services.',
        icons: [{ type: 'eui', src: 'logoAWS' }],
        url: '',
        integration: 'aws',
        name: 'aws-onboarding',
        version: '',
        categories: ['aws', 'observability'],
        onCardClick: navigateToOnboarding,
      };

      return [onboardingAwsTile, ...filtered];
    };
  }, [isOnboardingEnabled, navigateToOnboarding]);

  return { applyOnboardingOverride, isOnboardingEnabled };
}
