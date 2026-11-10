/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FlyoutSection, FlyoutSubsection } from '@kbn/flyout-sections';
import { i18n } from '@kbn/i18n';
import { PolicyScopeSummary, POLICY_SCOPE_LABEL } from '../details_flyout/policy_scope_summary';
import { useActionPolicySummary } from './action_policy_summary_context';

const EMPTY_VALUE = '-';

export interface ActionPolicySummaryDefinitionSectionProps {
  /** Rendered beside the "Policy scope" title, e.g. a link that only makes sense in the flyout. */
  policyScopeAction?: ReactNode;
}

export const ActionPolicySummaryDefinitionSection = ({
  policyScopeAction,
}: ActionPolicySummaryDefinitionSectionProps) => {
  const { description, matcher } = useActionPolicySummary();

  return (
    <FlyoutSection
      id="definition"
      title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.actionPolicy.title', {
        defaultMessage: 'Definition',
      })}
      hasBorder
      borderOnChildren
      data-test-subj="actionPolicyDetailsFlyoutDefinition"
    >
      <FlyoutSubsection
        title={i18n.translate('xpack.alertingV2.actionPolicy.detailsFlyout.description.label', {
          defaultMessage: 'Description',
        })}
        hasBorder
        data-test-subj="actionPolicyDetailsFlyoutDescriptionBlock"
      >
        <EuiText size="s">{description || EMPTY_VALUE}</EuiText>
      </FlyoutSubsection>
      <FlyoutSubsection
        title={
          policyScopeAction ? (
            <EuiFlexGroup
              component="span"
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem component="span" grow={false}>
                {POLICY_SCOPE_LABEL}
              </EuiFlexItem>
              <EuiFlexItem component="span" grow={false}>
                {policyScopeAction}
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            POLICY_SCOPE_LABEL
          )
        }
        hasBorder
        data-test-subj="actionPolicyDetailsFlyoutPolicyScopeBlock"
      >
        <PolicyScopeSummary matcher={matcher} />
      </FlyoutSubsection>
    </FlyoutSection>
  );
};
