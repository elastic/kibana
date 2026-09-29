/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiImage, EuiSpacer } from '@elastic/eui';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import useLocalStorage from 'react-use/lib/useLocalStorage';
import { ALERTING_V2_SECTION_ID, ALERTING_V2_RULES_APP_ID } from '@kbn/alerting-v2-constants';
import illustration from '../../assets/centralized_action_policies.svg';

export const ESQL_RULES_INTRO_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULES_APP_ID}.esqlRulesIntroBannerDismissed` as const;

/** Placeholder until comparison / ES|QL rules docs URL is finalized. */
export const ESQL_RULES_INTRO_DOC_URL = '#' as const;

const TITLE = i18n.translate('xpack.alertingV2.rulesList.esqlRulesIntroBanner.title', {
  defaultMessage: 'Introducing ES|QL rules',
});
const DESCRIPTION = i18n.translate('xpack.alertingV2.rulesList.esqlRulesIntroBanner.description', {
  defaultMessage:
    'Build rules with native ES|QL queries. ES|QL rules are the newer alternative to Standard rules, with a dedicated rules list, a shared alerts inbox, and centralized action policies for notifications.',
});
const LEARN_MORE_LABEL = i18n.translate(
  'xpack.alertingV2.rulesList.esqlRulesIntroBanner.learnMore',
  { defaultMessage: 'Learn more' }
);
const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.rulesList.esqlRulesIntroBanner.illustrationAlt',
  { defaultMessage: 'ES|QL rules illustration' }
);

export const EsqlRulesIntroBanner = () => {
  const { tours } = useService(CoreStart('notifications'));
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    ESQL_RULES_INTRO_BANNER_DISMISSED_STORAGE_KEY,
    false
  );

  if (!tours.isEnabled() || isDismissed) {
    return null;
  }

  return (
    <>
      <AnnouncementBanner
        data-test-subj="esqlRulesIntroBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={DESCRIPTION}
        media={<EuiImage src={illustration} alt={ILLUSTRATION_ALT} />}
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'esqlRulesIntroBannerDismiss' }}
        actionProps={{
          primary: {
            children: LEARN_MORE_LABEL,
            href: ESQL_RULES_INTRO_DOC_URL,
            target: '_blank',
            iconType: 'external',
            iconSide: 'right',
            'data-test-subj': 'esqlRulesIntroBannerLearnMore',
          },
        }}
      />
      <EuiSpacer size="m" />
    </>
  );
};
