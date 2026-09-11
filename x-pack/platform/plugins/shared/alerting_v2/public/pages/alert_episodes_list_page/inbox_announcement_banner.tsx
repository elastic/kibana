/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ALERTING_V2_SECTION_ID, ALERTING_V2_EPISODES_APP_ID } from '@kbn/alerting-v2-constants';

export const INBOX_ANNOUNCEMENT_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_EPISODES_APP_ID}.inboxIntroBannerDismissed.v3` as const;

const TITLE = i18n.translate('xpack.alertingV2.episodesList.inboxAnnouncementBanner.title', {
  defaultMessage: 'Introducing Inbox: every alert in one place',
});
const DESCRIPTION = i18n.translate(
  'xpack.alertingV2.episodesList.inboxAnnouncementBanner.description',
  {
    defaultMessage:
      "We've improved the alerts experience to work across alerting frameworks. Inbox includes alerts from v1, v2, and external sources so you can triage them in one place.",
  }
);

const illustrationStyles = css`
  max-inline-size: 100%;
`;

/**
 * Medium announcement illustration from `@kbn/announcement-banner` (`illustration_m.svg`),
 * inlined so the optimizer does not need a new plugin asset.
 */
const InboxIntroIllustration = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={80}
    height={80}
    fill="none"
    aria-hidden="true"
    focusable="false"
    css={illustrationStyles}
    data-test-subj="inboxAnnouncementBannerIllustration"
  >
    <mask
      id="inboxIntroIllustrationMask"
      width="72"
      height="71"
      x="4"
      y="5"
      maskUnits="userSpaceOnUse"
      style={{ maskType: 'luminance' }}
    >
      <path fill="#fff" d="M75.131 5H4.375v70.081h70.756z" />
    </mask>
    <g mask="url(#inboxIntroIllustrationMask)">
      <path
        fill="#153385"
        stroke="#101c3f"
        strokeMiterlimit={10}
        strokeWidth={1.607}
        d="M42.788 8.631c-17.432 0-31.563 14.132-31.563 31.563s14.131 31.562 31.563 31.562c17.43 0 31.562-14.13 31.562-31.562C74.35 22.763 60.22 8.63 42.788 8.63Zm0 53.625c-12.188 0-22.07-9.88-22.07-22.068s9.882-22.07 22.07-22.07c12.187 0 22.068 9.882 22.068 22.07 0 12.187-9.88 22.068-22.068 22.068Z"
      />
      <path
        fill="#153385"
        stroke="#101c3f"
        strokeMiterlimit={10}
        strokeWidth={1.607}
        d="M41.525 51.6c6.3 0 11.406-5.106 11.406-11.406s-5.106-11.406-11.406-11.406-11.406 5.106-11.406 11.406S35.225 51.6 41.525 51.6Z"
      />
      <path
        fill="#0b64dd"
        stroke="#101c3f"
        strokeMiterlimit={10}
        strokeWidth={1.607}
        d="M39.938 8.631c-17.432 0-31.563 14.132-31.563 31.557S22.506 71.75 39.938 71.75c17.43 0 31.562-14.131 31.562-31.562S57.369 8.63 39.938 8.63Zm0 53.625c-12.188 0-22.07-9.88-22.07-22.068s9.882-22.07 22.07-22.07c12.187 0 22.068 9.882 22.068 22.07 0 12.187-9.881 22.068-22.068 22.068Z"
      />
      <path
        fill="#48efcf"
        stroke="#101c3f"
        strokeMiterlimit={10}
        strokeWidth={1.607}
        d="M39.938 51.6c6.3 0 11.406-5.106 11.406-11.406s-5.107-11.406-11.407-11.406-11.406 5.106-11.406 11.406S33.638 51.6 39.938 51.6Z"
      />
      <path
        stroke="#153385"
        strokeMiterlimit={10}
        strokeWidth={1.607}
        d="M39.938 5v17.088M39.938 57.987v17.088M75.131 39.913H58.044M21.463 39.913H4.374"
      />
      <path fill="#fff" d="M31.837 40.25s7.175-10.25 16.2 0c0 0-6.968 9.637-16.2 0" />
      <path
        fill="#101c3f"
        d="M39.756 44.181a4 4 0 1 0 0-8c-2.212 0-4 1.788-4 4 0 2.213 1.788 4 4 4"
      />
    </g>
  </svg>
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
        media={<InboxIntroIllustration />}
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'inboxAnnouncementBannerDismiss' }}
      />
      <EuiSpacer size="m" />
    </>
  );
};
