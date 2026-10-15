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
import { ALERTING_V2_SECTION_ID, ALERTING_V2_RULES_APP_ID } from '@kbn/alerting-v2-constants';

export const UNIVERSAL_ALERTING_INTRO_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULES_APP_ID}.universalAlertingIntroBannerDismissed` as const;

const TITLE = i18n.translate('xpack.alertingV2.rulesList.universalAlertingIntroBanner.title', {
  defaultMessage: 'Introducing Kibana Universal Alerting',
});

const DESCRIPTION = i18n.translate(
  'xpack.alertingV2.rulesList.universalAlertingIntroBanner.description',
  {
    defaultMessage:
      "Bring your alerting needs together in one open, universal system. Detect the signals that matter, work with alerts as data, combine alerts across different sources and use cases, and control how they're managed, routed, and acted on.",
  }
);

const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.rulesList.universalAlertingIntroBanner.illustrationAlt',
  { defaultMessage: 'Kibana Universal Alerting illustration' }
);

const LEARN_MORE_LABEL = i18n.translate(
  'xpack.alertingV2.rulesList.universalAlertingIntroBanner.learnMoreLabel',
  { defaultMessage: 'Learn more' }
);

export const UniversalAlertingIntroBanner = () => {
  const { tours } = useService(CoreStart('notifications'));
  const { links } = useService(CoreStart('docLinks'));
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    UNIVERSAL_ALERTING_INTRO_BANNER_DISMISSED_STORAGE_KEY,
    false
  );

  if (!tours.isEnabled() || isDismissed) {
    return null;
  }

  return (
    <>
      <AnnouncementBanner
        data-test-subj="universalAlertingIntroBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={DESCRIPTION}
        media={<EuiIllustration type={aerospace} alt={ILLUSTRATION_ALT} />}
        actionProps={{
          primary: {
            children: LEARN_MORE_LABEL,
            href: links.alerting.compareAlertingSystems,
            target: '_blank',
            iconType: 'external',
            iconSide: 'right',
            'data-test-subj': 'universalAlertingIntroBannerLearnMore',
          },
        }}
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'universalAlertingIntroBannerDismiss' }}
      />
      <EuiSpacer size="m" />
    </>
  );
};
