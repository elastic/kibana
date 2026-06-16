/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import { EuiImage } from '@elastic/eui';
import { AnnouncementBanner } from '@kbn/announcement-banner';
import illustration from '../../../assets/centralized_action_policies.svg';

// TODO: replace with paths.actionPolicyCreate from x-pack/platform/plugins/shared/alerting_v2/public/constants.ts
// once that constant is exported from the plugin or moved to a shared package.
const ACTION_POLICY_CREATE_PATH = '/app/management/alertingV2/action_policies/create';

// TODO: replace with docLinks.links.alerting.actionPolicies once a dedicated
// key is added to kbn-doc-links/src/get_doc_links.ts.
const CENTRALIZED_ACTION_POLICIES_DOCS_URL =
  'https://www.elastic.co/docs/explore-analyze/alerts-cases/alerts';

const title = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.centralizedActionPoliciesPanel.title',
  { defaultMessage: 'Centralized action policies' }
);

const description = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.centralizedActionPoliciesPanel.description',
  {
    defaultMessage:
      'Action Policies let you manage notification channels in one place and reuse them across multiple rules.',
  }
);

const createCtaLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.centralizedActionPoliciesPanel.createCta',
  { defaultMessage: 'Create action policy' }
);

const learnMoreLabel = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.centralizedActionPoliciesPanel.learnMore',
  { defaultMessage: 'Learn more' }
);

const illustrationAlt = i18n.translate(
  'xpack.responseOps.alertingV2RuleForm.centralizedActionPoliciesPanel.illustrationAlt',
  { defaultMessage: 'Centralized action policies illustration' }
);

interface Props {
  http: HttpStart;
}

export const CentralizedActionPoliciesPanel = ({ http }: Props) => {
  const createUrl = http.basePath.prepend(ACTION_POLICY_CREATE_PATH);

  return (
    <AnnouncementBanner
      size="s"
      color="plain"
      headingElement="h3"
      title={title}
      text={description}
      media={<EuiImage src={illustration} alt={illustrationAlt} />}
      actionProps={{
        primary: {
          children: createCtaLabel,
          fill: true,
          href: createUrl,
          target: '_blank',
          iconType: 'popout',
          iconSide: 'right',
          'data-test-subj': 'centralizedActionPoliciesCreate',
        },
        secondary: {
          children: learnMoreLabel,
          href: CENTRALIZED_ACTION_POLICIES_DOCS_URL,
          target: '_blank',
          iconType: 'popout',
          iconSide: 'right',
          'data-test-subj': 'centralizedActionPoliciesLearnMore',
        },
      }}
    />
  );
};
