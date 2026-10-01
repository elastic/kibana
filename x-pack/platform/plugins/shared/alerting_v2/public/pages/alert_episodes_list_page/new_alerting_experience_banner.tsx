/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiIllustration, EuiSpacer } from '@elastic/eui';
import { aerospace } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ALERTING_V2_EPISODES_APP_ID, ALERTING_V2_SECTION_ID } from '@kbn/alerting-v2-constants';

export const NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.newAlertingExperienceBannerDismissed` as const;

const TITLE = i18n.translate('xpack.alertingV2.episodesList.newAlertingExperienceBanner.title', {
  defaultMessage: 'Introducing a new alerts experience',
});

const DESCRIPTION = i18n.translate(
  'xpack.alertingV2.episodesList.newAlertingExperienceBanner.description',
  {
    defaultMessage:
      "We've improved the alerts experience to work across alerting frameworks. This new alerts page includes alerts from Kibana ES|QL alerting, Kibana standard alerting, and external sources so you can triage them in one place.",
  }
);

const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.episodesList.newAlertingExperienceBanner.illustrationAlt',
  { defaultMessage: 'New alerts experience illustration' }
);

export const NewAlertingExperienceBanner = () => {
  const { tours } = useService(CoreStart('notifications'));
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    NEW_ALERTING_EXPERIENCE_BANNER_DISMISSED_STORAGE_KEY,
    false
  );

  if (!tours.isEnabled() || isDismissed) {
    return null;
  }

  return (
    <>
      <AnnouncementBanner
        data-test-subj="newAlertingExperienceBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={DESCRIPTION}
        media={<EuiIllustration type={aerospace} alt={ILLUSTRATION_ALT} />}
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'newAlertingExperienceBannerDismiss' }}
      />
      <EuiSpacer size="m" />
    </>
  );
};
