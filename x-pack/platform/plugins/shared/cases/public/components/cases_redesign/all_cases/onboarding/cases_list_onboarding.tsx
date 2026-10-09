/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '../../../../common/lib/kibana';
import { useNewFeatureSeen } from '../../../../common/use_new_feature_seen';
import { LOCAL_STORAGE_KEYS } from '../../../../../common/constants';
import { GuidedTour } from '../../../tour/guided_tour';
import { CasesListWelcomeBanner } from './cases_list_welcome_banner';
import { CASES_LIST_TOUR_STEPS, CASES_LIST_TOUR_TEST_ID_PREFIX } from './tour_steps';

/**
 * Ties together the redesigned cases list "what's new" banner and its guided tour: shows the
 * dismissible banner until dismissed, launches the tour from the banner's "Start tour" action,
 * and persists the dismissed state. Respects the global `hideAnnouncements` opt-out.
 */
export const CasesListOnboarding: React.FC = () => {
  const {
    services: { notifications },
  } = useKibana();
  const isTourEnabled = notifications.tours.isEnabled();

  const { isNew: showBanner, markSeen: dismissBanner } = useNewFeatureSeen(
    LOCAL_STORAGE_KEYS.casesListBannerDismissed
  );
  const [isTourActive, setIsTourActive] = useState(false);

  const startTour = useCallback(() => setIsTourActive(true), []);
  const finishTour = useCallback(() => {
    setIsTourActive(false);
    dismissBanner();
  }, [dismissBanner]);

  if (!isTourEnabled) {
    return null;
  }

  return (
    <>
      {showBanner && !isTourActive ? (
        <CasesListWelcomeBanner onStartTour={startTour} onDismiss={dismissBanner} />
      ) : null}
      <GuidedTour
        steps={CASES_LIST_TOUR_STEPS}
        isActive={isTourActive}
        onFinish={finishTour}
        testIdPrefix={CASES_LIST_TOUR_TEST_ID_PREFIX}
      />
    </>
  );
};
CasesListOnboarding.displayName = 'CasesListOnboarding';
