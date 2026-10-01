/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, type ReactNode } from 'react';
import { EuiBadge, EuiCode, EuiFlexGroup, EuiFlexItem, EuiText, EuiTextColor } from '@elastic/eui';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

const OR_LABEL = i18n.translate('xpack.alertingV2.actionPolicyDefinition.matcher.or', {
  defaultMessage: 'or',
});

const AND_LABEL = i18n.translate('xpack.alertingV2.actionPolicyDefinition.matcher.and', {
  defaultMessage: 'and',
});

const CLAUSE_LABELS = {
  tags: i18n.translate('xpack.alertingV2.actionPolicyDefinition.matcher.tags', {
    defaultMessage: 'Rule tagged with',
  }),
  expression: i18n.translate('xpack.alertingV2.actionPolicyDefinition.matcher.expression', {
    defaultMessage: 'Matches query',
  }),
};

const renderOrList = (values: string[]): ReactNode =>
  values.map((value, index) => (
    <Fragment key={`${value}-${index}`}>
      {index > 0 && <EuiTextColor color="subdued"> {OR_LABEL} </EuiTextColor>}
      <EuiBadge color="hollow" title={value}>
        {value}
      </EuiBadge>
    </Fragment>
  ));

interface Clause {
  key: string;
  label: string;
  node: ReactNode;
}

const buildClauses = (matcher: PolicyMatcher): Clause[] => {
  const clauses: Clause[] = [];
  const { tags, expression } = matcher;

  if (tags?.length) {
    clauses.push({ key: 'tags', label: CLAUSE_LABELS.tags, node: renderOrList(tags) });
  }

  const trimmedExpression = expression?.trim();
  if (trimmedExpression) {
    clauses.push({
      key: 'expression',
      label: CLAUSE_LABELS.expression,
      node: <EuiCode>{trimmedExpression}</EuiCode>,
    });
  }

  return clauses;
};

export interface MatcherSummaryProps {
  matcher: PolicyMatcher | null | undefined;
}

export const MatcherSummary = ({ matcher }: MatcherSummaryProps) => {
  const clauses = matcher ? buildClauses(matcher) : [];

  if (clauses.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.alertingV2.actionPolicyDefinition.matchesAll"
          defaultMessage="Matches all alerts."
        />
      </EuiText>
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <FormattedMessage
            id="xpack.alertingV2.actionPolicyDefinition.matcher.matchesWhere"
            defaultMessage="Matches alerts where"
          />
        </EuiText>
      </EuiFlexItem>
      {clauses.map((clause, index) => (
        <EuiFlexItem grow={false} key={clause.key}>
          <EuiText size="s">
            {index > 0 && <EuiTextColor color="subdued">{AND_LABEL} </EuiTextColor>}
            <strong>{clause.label}</strong> {clause.node}
          </EuiText>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
