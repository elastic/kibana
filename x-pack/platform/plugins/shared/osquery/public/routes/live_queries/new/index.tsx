/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';

import { isArray } from 'lodash';
import { WithHeaderLayout } from '../../../components/layouts';
import { useRouterNavigate } from '../../../common/lib/kibana';
import { useGoBack } from '../../../common/use_go_back';
import { pagePathGetters } from '../../../common/page_paths';
import type { LocationStateWithFromHistory } from '../../../common/use_go_back';
import { LiveQuery } from '../../../live_queries';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

interface LocationState extends LocationStateWithFromHistory {
  form: Record<string, unknown>;
}

const NewLiveQueryPageComponent = () => {
  useBreadcrumbs('new_query');
  const { replace, push } = useHistory();
  const location = useLocation<LocationState>();
  const handleGoBack = useGoBack(pagePathGetters.history());
  const backNavigationProps = useRouterNavigate(pagePathGetters.history(), handleGoBack);
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

  const handleSuccess = useCallback(
    (actionId: string) => {
      push(pagePathGetters.history_details({ liveQueryId: actionId }));
    },
    [push]
  );

  const LeftColumn = useMemo(
    () => (
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem>
          <EuiButtonEmpty
            iconType="chevronSingleLeft"
            {...backNavigationProps}
            flush="left"
            size="xs"
          >
            <FormattedMessage
              id="xpack.osquery.newLiveQuery.viewHistoryTitle"
              defaultMessage="View history"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText>
            <h1>
              <FormattedMessage
                id="xpack.osquery.newLiveQuery.pageTitle"
                defaultMessage="Run query"
              />
            </h1>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [backNavigationProps]
  );

  return (
    <WithHeaderLayout leftColumn={LeftColumn}>
      <LiveQuery
        {...initialFormData}
        agentPolicyIds={agentPolicyIds}
        onSuccess={handleSuccess}
        redirectsOnSuccess
      />
    </WithHeaderLayout>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
