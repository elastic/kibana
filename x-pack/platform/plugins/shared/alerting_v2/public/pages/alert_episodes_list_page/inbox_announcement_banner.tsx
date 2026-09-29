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
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ALERTING_V2_SECTION_ID, ALERTING_V2_EPISODES_APP_ID } from '@kbn/alerting-v2-constants';

export const INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.inboxIntroBannerDismissed.v5` as const;

const TITLE = i18n.translate('xpack.alertingV2.episodesList.inboxAnnouncementBanner.title', {
  defaultMessage: 'Introducing a new alerts experience',
});
const DESCRIPTION = i18n.translate(
  'xpack.alertingV2.episodesList.inboxAnnouncementBanner.description',
  {
    defaultMessage:
      "We've improved the alerts experience to work across alerting frameworks. This new alerts page includes alerts from Kibana ES|QL alerting, Kibana standard alerting, and external sources so you can triage them in one place.",
  }
);
const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.episodesList.inboxAnnouncementBanner.illustrationAlt',
  { defaultMessage: 'New alerts experience illustration' }
);

export const InboxAnnouncementBanner = () => {
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY,
    false
  );

  if (isDismissed) {
    return null;
  }

  return (
    <>
      <AnnouncementBanner
        data-test-subj="inboxAnnouncementBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={DESCRIPTION}
        media={
          <EuiIllustration
            type={aerospace}
            alt={ILLUSTRATION_ALT}
            style={{ maxInlineSize: 80, marginInline: 'auto' }}
            data-test-subj="inboxAnnouncementBannerIllustration"
          />
        }
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'inboxAnnouncementBannerDismiss' }}
      />
      <EuiSpacer size="m" />
    </>
  );
};
