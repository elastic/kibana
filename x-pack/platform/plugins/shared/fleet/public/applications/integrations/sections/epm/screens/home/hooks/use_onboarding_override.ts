/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import { useStartServices } from '../../../../../hooks';
import {
  AWS_ONBOARDING_PACKAGE_NAME,
  AWS_TITLE,
  ONBOARDING_APP_ID,
  ONBOARDING_AWS_PATH,
  ONBOARDING_ENABLED_FLAG,
  getSearchMembers,
  isHiddenByAwsOnboarding,
} from '../../../../../../../services/aws_onboarding_override';

import type { IntegrationCardItem } from '..';

const AWS_DESCRIPTION = i18n.translate('xpack.fleet.onboardingOverride.awsDescription', {
  defaultMessage: 'Collect logs and metrics from Amazon Web Services (AWS).',
});

export { AWS_ONBOARDING_PACKAGE_NAME };

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
        if (isHiddenByAwsOnboarding(card.name, card.id)) {
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
