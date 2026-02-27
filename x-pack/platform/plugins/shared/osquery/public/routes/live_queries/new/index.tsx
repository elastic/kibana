/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';

import { isArray } from 'lodash';
import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { LiveQuery } from '../../../live_queries';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';
import { useIsExperimentalFeatureEnabled } from '../../../common/experimental_features_context';

interface LocationState {
  form: Record<string, unknown>;
}

const NewLiveQueryPageComponent = () => {
  const isHistoryEnabled = useIsExperimentalFeatureEnabled('queryHistoryRework');
  useBreadcrumbs(isHistoryEnabled ? 'new_query' : 'live_query_new');
  const { replace } = useHistory();
  const location = useLocation<LocationState>();
  const backNavigationTarget = isHistoryEnabled ? 'history' : 'live_queries';
  const backNavigationProps = useRouterNavigate(backNavigationTarget);
  const [initialFormData, setInitialFormData] = useState<Record<string, unknown> | undefined>({});

  const agentPolicyIds = useMemo(() => {
    const queryParams = qs.parse(location.search);

    return queryParams?.agentPolicyId
      ? isArray(queryParams?.agentPolicyId)
        ? queryParams?.agentPolicyId
        : [queryParams?.agentPolicyId]
      : undefined;
  }, [location.search]);

  useEffect(() => {
    if (location.state?.form) {
      setInitialFormData(location.state?.form);
      replace({ state: null });
    }
  }, [location.state?.form, replace]);

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty iconType="arrowLeft" {...backNavigationProps} flush="left" size="xs">
            {isHistoryEnabled ? (
              <FormattedMessage
                id="xpack.osquery.newLiveQuery.viewHistoryTitle"
                defaultMessage="View history"
              />
            ) : (
              <FormattedMessage
                id="xpack.osquery.newLiveQuery.viewLiveQueriesHistoryTitle"
                defaultMessage="View live queries history"
              />
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.newLiveQuery.pageTitle"
                defaultMessage="New live query"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [backNavigationProps, isHistoryEnabled]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <LiveQuery {...initialFormData} agentPolicyIds={agentPolicyIds} />
    </WithHeaderLayout>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
