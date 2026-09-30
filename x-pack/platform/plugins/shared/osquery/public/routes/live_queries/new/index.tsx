/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import qs from 'query-string';

import { isArray } from 'lodash';
import { fullWidthFormContentCss } from '../../../components/layouts';
import { pagePathGetters } from '../../../common/page_paths';
import { LiveQuery } from '../../../live_queries';
import { useBreadcrumbs } from '../../../common/hooks/use_breadcrumbs';

interface LocationState {
  form: Record<string, unknown>;
}

const NewLiveQueryPageComponent = () => {
  useBreadcrumbs('new_query');
  const { replace, push } = useHistory();
  const location = useLocation<LocationState>();
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

  return (
    <div css={fullWidthFormContentCss}>
      <LiveQuery
        {...initialFormData}
        agentPolicyIds={agentPolicyIds}
        onSuccess={handleSuccess}
        redirectsOnSuccess
      />
    </div>
  );
};

export const NewLiveQueryPage = React.memo(NewLiveQueryPageComponent);
