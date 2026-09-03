/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EMPTY } from 'rxjs';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { SecurityPageName } from '@kbn/deeplinks-security';
import { useKibana } from './use_kibana';

// TODO: Replace with a locator when available
const SECURITY_ONBOARDING_LINK = `/app/security/${SecurityPageName.landing}`;
const DEFAULT_ONBOARDING_LINK = '/app/integrations/browse';

export const useOnboardingLink = (): string => {
  const {
    core: { http },
    dependencies: {
      start: { spaces, share, cloud },
    },
  } = useKibana();

  const observabilityOnboardingLocator =
    share.url.locators.get<ObservabilityOnboardingLocatorParams>(OBSERVABILITY_ONBOARDING_LOCATOR);

  const spaceObservable = useMemo(() => (spaces ? spaces.getActiveSpace$() : EMPTY), [spaces]);
  const activeSpace = useObservable(spaceObservable);

  const isObservabilitySpace =
    cloud?.serverless?.projectType === 'observability' || activeSpace?.solution === 'oblt';
  const isSecuritySpace =
    cloud?.serverless?.projectType === 'security' || activeSpace?.solution === 'security';

  if (observabilityOnboardingLocator && isObservabilitySpace) {
    return observabilityOnboardingLocator.getRedirectUrl({});
  }

  if (isSecuritySpace) {
    return http.basePath.prepend(SECURITY_ONBOARDING_LINK);
  }

  return http.basePath.prepend(DEFAULT_ONBOARDING_LINK);
};
