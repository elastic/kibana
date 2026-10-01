/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, type EuiFlyoutProps } from '@elastic/eui';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';
import React from 'react';
import { AffectedRulesTable } from './affected_rules_table';
import {
  POLICY_SCOPE_LABEL,
  PolicyScopeSummary,
  getPolicyScopeKind,
  type PolicyScopeKind,
} from './policy_scope_summary';

const ALL_RULES_CALLOUT_TITLES: Record<
  Extract<PolicyScopeKind, 'catchAll' | 'expressionOnly'>,
  string
> = {
  catchAll: i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.catchAll', {
    defaultMessage: 'All rules in this space that create alerts are handled by this policy.',
  }),
  expressionOnly: i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.expressionOnly', {
    defaultMessage:
      'All rules in this space that create alerts may be handled by this policy, depending on the matching query.',
  }),
};

const MATCHING_QUERY_CALLOUT_TITLE = i18n.translate(
  'xpack.alertingV2.actionPolicy.affectedRules.tagsAndExpression',
  {
    defaultMessage:
      'These rules have at least one of the policy tags. The matching query decides which of their alerts this policy handles.',
  }
);

interface Props {
  matcher?: PolicyMatcher | null;
  /** Shared with the details flyout so EUI links both flyouts in one history and renders Back. */
  historyKey: symbol;
  onClose: () => void;
  ownFocus?: EuiFlyoutProps['ownFocus'];
}

const { Header, Body } = FlyoutTemplate;

export const AffectedRulesFlyout = ({ matcher, historyKey, onClose, ownFocus = false }: Props) => {
  const scopeKind = getPolicyScopeKind(matcher);

  return (
    <FlyoutTemplate
      type="overlay"
      size="m"
      resizable
      ownFocus={ownFocus}
      session="start"
      historyKey={historyKey}
      onClose={onClose}
      data-test-subj="actionPolicyAffectedRulesFlyout"
    >
      <Header
        title={i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.title', {
          defaultMessage: 'Affected rules',
        })}
      />
      <Body>
        <Body.Section
          title={POLICY_SCOPE_LABEL}
          hasBorder
          data-test-subj="actionPolicyAffectedRulesPolicyScope"
        >
          <PolicyScopeSummary matcher={matcher} />
        </Body.Section>
        <Body.Section
          title={i18n.translate('xpack.alertingV2.actionPolicy.affectedRules.rules.title', {
            defaultMessage: 'Rules',
          })}
          data-test-subj="actionPolicyAffectedRulesRules"
        >
          {scopeKind === 'tagsOnly' || scopeKind === 'tagsAndExpression' ? (
            <>
              {scopeKind === 'tagsAndExpression' && (
                <>
                  <KbnInfoCallout
                    size="s"
                    title={MATCHING_QUERY_CALLOUT_TITLE}
                    data-test-subj="actionPolicyAffectedRulesMatchingQueryCallout"
                  />
                  <EuiSpacer size="m" />
                </>
              )}
              <AffectedRulesTable matcher={matcher} />
            </>
          ) : (
            <KbnInfoCallout
              size="s"
              title={ALL_RULES_CALLOUT_TITLES[scopeKind]}
              data-test-subj="actionPolicyAffectedRulesAllRulesCallout"
            />
          )}
        </Body.Section>
      </Body>
    </FlyoutTemplate>
  );
};
