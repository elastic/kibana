/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { lazy, Suspense } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useFetchRule } from '../hooks/use_fetch_rule';
import { Skeleton } from '../components/rule_details/skeleton';
import { RuleProvider } from '../components/rule_details/rule_context';

const LazyRuleDetailPage = lazy(async () => {
  const module = await import('../components/rule_details/rule_detail_page');
  return { default: module.RuleDetailPage };
});

export const RuleDetailsRoute: React.FunctionComponent = () => {
  const { ruleId } = useParams<{ ruleId: string }>();
  const { data: rule, isLoading, isError } = useFetchRule(ruleId);
  const history = useHistory();

  if (isLoading) {
    return <Skeleton />;
  }

  if (isError || !rule) {
    return (
      <EuiEmptyPrompt
        iconType="warning"
        color="danger"
        title={
          <h2>
            {i18n.translate('xpack.alertingV2.ruleDetails.errorTitle', {
              defaultMessage: 'Unable to load rule',
            })}
          </h2>
        }
        body={
          <p>
            {i18n.translate('xpack.alertingV2.ruleDetails.errorBody', {
              defaultMessage: 'The rule could not be found or an error occurred while loading it.',
            })}
          </p>
        }
        actions={[
          <EuiButton
            color="primary"
            fill
            onClick={() => history.push('/')}
            data-test-subj="ruleDetailsErrorBackButton"
          >
            {i18n.translate('xpack.alertingV2.ruleDetails.backToRules', {
              defaultMessage: 'Back to rules',
            })}
          </EuiButton>,
        ]}
        data-test-subj="ruleDetailsErrorPrompt"
      />
    );
  }

  return (
    <RuleProvider rule={rule}>
      <Suspense fallback={<Skeleton />}>
        <LazyRuleDetailPage />
      </Suspense>
    </RuleProvider>
  );
};
