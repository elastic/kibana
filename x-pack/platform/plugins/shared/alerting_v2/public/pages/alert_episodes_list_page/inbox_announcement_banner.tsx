/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiConfirmModal, EuiIllustration, EuiLink, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { aerospace } from '@elastic/eui-illustrations';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import {
  ALERTING_V1_ENABLED_SETTING_ID,
  ALERTING_V2_EPISODES_APP_ID,
  ALERTING_V2_SECTION_ID,
} from '@kbn/alerting-v2-constants';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import useLocalStorage from 'react-use/lib/useLocalStorage';

export const INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.inboxIntroBannerDismissed.v5` as const;

const STANDARD_ALERTS_APP_ID = 'observability-overview';
const STANDARD_ALERTS_PATH = '/alerts';

const TITLE = i18n.translate('xpack.alertingV2.episodesList.inboxAnnouncementBanner.title', {
  defaultMessage: 'Introducing a new alerts experience',
});
const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.episodesList.inboxAnnouncementBanner.illustrationAlt',
  { defaultMessage: 'New alerts experience illustration' }
);

export const InboxAnnouncementBanner = () => {
  const settings = useService(CoreStart('settings'));
  const application = useService(CoreStart('application'));
  const { toasts } = useService(CoreStart('notifications'));
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY,
    false
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const modalTitleId = useGeneratedHtmlId();

  const isStandardAlertsEnabled = settings.globalClient.get<boolean>(
    ALERTING_V1_ENABLED_SETTING_ID,
    false
  );

  const advancedSettingsUrl = application.getUrlForApp('management', {
    path: `/kibana/settings?query=${encodeURIComponent('Standard alerts experience')}`,
  });

  if (isDismissed) {
    return null;
  }

  const openConfirmModal = () => setIsConfirmOpen(true);
  const closeConfirmModal = () => {
    if (isEnabling) {
      return;
    }
    setIsConfirmOpen(false);
  };

  const enableStandardAlerts = async () => {
    setIsEnabling(true);
    try {
      await settings.globalClient.set(ALERTING_V1_ENABLED_SETTING_ID, true);
      window.location.assign(
        application.getUrlForApp(STANDARD_ALERTS_APP_ID, { path: STANDARD_ALERTS_PATH })
      );
    } catch (error) {
      setIsEnabling(false);
      setIsConfirmOpen(false);
      toasts.addError(error instanceof Error ? error : new Error(String(error)), {
        title: i18n.translate(
          'xpack.alertingV2.episodesList.inboxAnnouncementBanner.enableStandardErrorTitle',
          { defaultMessage: 'Unable to enable the Standard Alerts experience' }
        ),
      });
    }
  };

  return (
    <>
      <AnnouncementBanner
        data-test-subj="inboxAnnouncementBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={
          <FormattedMessage
            id="xpack.alertingV2.episodesList.inboxAnnouncementBanner.description"
            defaultMessage="We've improved the alerts experience to work across alerting frameworks. This new alerts page includes alerts from Kibana ES|QL alerting, Kibana standard alerting, and external sources so you can triage them in one place.{standardLink}"
            values={{
              standardLink: isStandardAlertsEnabled ? null : (
                <>
                  {' '}
                  <FormattedMessage
                    id="xpack.alertingV2.episodesList.inboxAnnouncementBanner.standardLinkPrompt"
                    defaultMessage="Prefer the previews alert page? {link}"
                    values={{
                      link: (
                        <EuiLink
                          onClick={openConfirmModal}
                          data-test-subj="inboxAnnouncementBannerStandardLink"
                        >
                          <FormattedMessage
                            id="xpack.alertingV2.episodesList.inboxAnnouncementBanner.standardLinkLabel"
                            defaultMessage="Enable standard view"
                          />
                        </EuiLink>
                      ),
                    }}
                  />
                </>
              ),
            }}
          />
        }
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
      {isConfirmOpen && (
        <EuiConfirmModal
          aria-labelledby={modalTitleId}
          titleProps={{ id: modalTitleId }}
          title={i18n.translate(
            'xpack.alertingV2.episodesList.inboxAnnouncementBanner.confirmTitle',
            { defaultMessage: 'Enable the Standard Alerts experience?' }
          )}
          onCancel={closeConfirmModal}
          onConfirm={enableStandardAlerts}
          cancelButtonText={i18n.translate(
            'xpack.alertingV2.episodesList.inboxAnnouncementBanner.confirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.alertingV2.episodesList.inboxAnnouncementBanner.confirmButton',
            { defaultMessage: 'Enabled standard view' }
          )}
          buttonColor="primary"
          isLoading={isEnabling}
          data-test-subj="inboxAnnouncementBannerStandardConfirmModal"
        >
          <FormattedMessage
            id="xpack.alertingV2.episodesList.inboxAnnouncementBanner.confirmBody"
            defaultMessage="This enables the Standard Alerts page, adds it to the navigation menu, and takes you there. You can change this later in Stack Management → {advancedSettingsLink} → Alerting → Standard alerts experience."
            values={{
              advancedSettingsLink: (
                <EuiLink
                  href={advancedSettingsUrl}
                  data-test-subj="inboxAnnouncementBannerAdvancedSettingsLink"
                >
                  <FormattedMessage
                    id="xpack.alertingV2.episodesList.inboxAnnouncementBanner.confirmBody.advancedSettingsLink"
                    defaultMessage="Advanced Settings"
                  />
                </EuiLink>
              ),
            }}
          />
        </EuiConfirmModal>
      )}
    </>
  );
};
