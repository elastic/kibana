/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { HttpStart } from '@kbn/core-http-browser';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
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
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiImage src={illustration} alt={illustrationAlt} width={96} height={96} />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                href={createUrl}
                target="_blank"
                iconType="popout"
                iconSide="right"
                data-test-subj="centralizedActionPoliciesCreate"
              >
                {createCtaLabel}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                href={CENTRALIZED_ACTION_POLICIES_DOCS_URL}
                target="_blank"
                iconType="popout"
                iconSide="right"
                data-test-subj="centralizedActionPoliciesLearnMore"
              >
                {learnMoreLabel}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
