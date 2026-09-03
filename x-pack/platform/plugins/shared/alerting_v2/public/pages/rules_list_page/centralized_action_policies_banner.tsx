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
import { paths } from '../../constants';
import { UserCapabilities } from '../../services/user_capabilities';
import illustration from '../../assets/centralized_action_policies.svg';

export const CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY =
  `${ALERTING_V2_SECTION_ID}.${ALERTING_V2_RULES_APP_ID}.centralizedActionPoliciesBannerDismissed` as const;

const TITLE = i18n.translate('xpack.alertingV2.rulesList.centralizedActionPoliciesBanner.title', {
  defaultMessage: 'Centralized action policies',
});
const DESCRIPTION = i18n.translate(
  'xpack.alertingV2.rulesList.centralizedActionPoliciesBanner.description',
  {
    defaultMessage:
      'Action policies let you manage notification channels in one place and reuse them across multiple rules.',
  }
);
const CREATE_CTA_LABEL = i18n.translate(
  'xpack.alertingV2.rulesList.centralizedActionPoliciesBanner.createCta',
  { defaultMessage: 'Create action policy' }
);
const LEARN_MORE_LABEL = i18n.translate(
  'xpack.alertingV2.rulesList.centralizedActionPoliciesBanner.learnMore',
  { defaultMessage: 'Learn more' }
);
const ILLUSTRATION_ALT = i18n.translate(
  'xpack.alertingV2.rulesList.centralizedActionPoliciesBanner.illustrationAlt',
  { defaultMessage: 'Centralized action policies illustration' }
);

export const CentralizedActionPoliciesBanner = () => {
  const canCreateActionPolicy = useService(UserCapabilities).canWrite('actionPolicies');
  const { tours } = useService(CoreStart('notifications'));
  const { navigateToUrl } = useService(CoreStart('application'));
  const { basePath } = useService(CoreStart('http'));
  const docLinks = useService(CoreStart('docLinks'));
  const [isDismissed, setIsDismissed] = useLocalStorage<boolean>(
    CENTRALIZED_ACTION_POLICIES_BANNER_DISMISSED_STORAGE_KEY,
    false
  );

  if (!tours.isEnabled() || !canCreateActionPolicy || isDismissed) {
    return null;
  }

  const createUrl = basePath.prepend(paths.actionPolicyCreate);

  return (
    <>
      <AnnouncementBanner
        data-test-subj="centralizedActionPoliciesBanner"
        size="m"
        headingElement="h3"
        title={TITLE}
        text={DESCRIPTION}
        media={<EuiImage src={illustration} alt={ILLUSTRATION_ALT} />}
        onDismiss={() => setIsDismissed(true)}
        dismissButtonProps={{ 'data-test-subj': 'centralizedActionPoliciesBannerDismiss' }}
        actionProps={{
          primary: {
            children: CREATE_CTA_LABEL,
            href: createUrl,
            onClick: (e: React.MouseEvent) => {
              e.preventDefault();
              navigateToUrl(createUrl);
            },
            'data-test-subj': 'centralizedActionPoliciesCreate',
          },
          secondary: {
            children: LEARN_MORE_LABEL,
            href: docLinks.links.alerting.actionPolicies,
            target: '_blank',
            iconType: 'external',
            iconSide: 'right',
            'data-test-subj': 'centralizedActionPoliciesLearnMore',
          },
        }}
      />
      <EuiSpacer size="m" />
    </>
  );
};
