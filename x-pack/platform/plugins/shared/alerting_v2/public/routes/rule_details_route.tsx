/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { EuiLoadingSpinner } from '@elastic/eui';
import { useExistingRule } from '../hooks/use_existing_rule';
import { Skeleton } from '../components/rule_details/skeleton';

interface RuleDetailsRouteParams {
  ruleId: string;
}

type RuleDetailsRouteProps = RouteComponentProps<RuleDetailsRouteParams>;

const LazyRuleDetailPage = lazy(async () => {
  const module = await import('../components/rule_details/rule_detail_page');
  return { default: module.RuleDetailPage };
});

export const RuleDetailsRoute: React.FunctionComponent<RuleDetailsRouteProps> = ({ match }) => {
  const { rule } = useExistingRule(match.params.ruleId);

  if (!rule) {
    return <Skeleton />;
  }

  return (
    <Suspense fallback={<EuiLoadingSpinner size="m" />}>
      <LazyRuleDetailPage rule={rule} />
    </Suspense>
  );
};

// eslint-disable-next-line import/no-default-export
export default RuleDetailsRoute;
