/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, AppUpdater, CoreSetup } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { from, map, switchMap } from 'rxjs';
import { INGEST_HUB_ONBOARDING_ENABLED_FLAG } from '../../common/constants';

export function registerOnboardingApp(
  coreSetup: CoreSetup,
  startServicesPromise: ReturnType<CoreSetup['getStartServices']>
) {
  coreSetup.application.register({
    id: 'onboarding',
    title: i18n.translate('xpack.ingestHub.onboardingAppTitle', {
      defaultMessage: 'Onboarding',
    }),
    appRoute: '/app/onboarding',
    visibleIn: [],
    chromeless: true,
    updater$: from(startServicesPromise).pipe(
      switchMap(([coreStart]) =>
        coreStart.featureFlags.getBooleanValue$(INGEST_HUB_ONBOARDING_ENABLED_FLAG, false).pipe(
          map(
            (enabled): AppUpdater =>
              () => ({ visibleIn: enabled ? ['globalSearch'] : [] })
          )
        )
      )
    ),
    mount: async (params: AppMountParameters) => {
      const [coreStart] = await startServicesPromise;
      const isEnabled = coreStart.featureFlags.getBooleanValue(
        INGEST_HUB_ONBOARDING_ENABLED_FLAG,
        false
      );

      if (!isEnabled) {
        coreStart.application.navigateToApp('discover');
        return () => {};
      }

      const { renderOnboardingApp } = await import('./onboarding_app');
      return renderOnboardingApp(coreStart, params);
    },
  });
}
