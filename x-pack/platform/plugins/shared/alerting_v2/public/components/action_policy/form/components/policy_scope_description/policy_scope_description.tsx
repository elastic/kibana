/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface PolicyScopeDescriptionProps {
  matcher: PolicyMatcher | null;
}

const getScopeCardText = (matcher: PolicyMatcher | null): string => {
  const hasTags = !!matcher?.tags?.length;
  const hasExpression = !!matcher?.expression?.trim();

  if (hasTags && hasExpression) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.card.tagsAndExpression', {
      defaultMessage:
        'Applies to all rules with one or more of the selected tags, and matching the expression conditions',
    });
  }
  if (hasTags) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.card.tagsOnly', {
      defaultMessage: 'Applies to all rules with one or more of the selected tags',
    });
  }
  if (hasExpression) {
    return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.card.expressionOnly', {
      defaultMessage: 'Applies to all alerts matching the expression conditions',
    });
  }
  return i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.card.catchAll', {
    defaultMessage: 'Applies to all alerts in the space',
  });
};

export const PolicyScopeDescription = ({ matcher }: PolicyScopeDescriptionProps) => {
  return (
    <>
      <EuiText size="s">
        <p>
          {i18n.translate('xpack.alertingV2.actionPolicy.form.policyScope.description', {
            defaultMessage:
              'Define which alert episodes this policy applies to. Select rule tags (joined with OR) and/or add a KQL match expression in advanced matching.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiPanel color="subdued" paddingSize="s">
        <EuiText size="s">{getScopeCardText(matcher)}</EuiText>
      </EuiPanel>
    </>
  );
};
