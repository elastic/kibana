/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { PolicyList as PresentationComponent } from './policy_list';
import { useKibana } from '../../../shared_imports';
import { useLoadPoliciesList } from '../../services/api';
import { PolicyListContextProvider } from './policy_list_context';

export const PolicyList: React.FunctionComponent = () => {
  const {
    services: { breadcrumbService },
  } = useKibana();
  const { data: policies, isLoading, error, resendRequest } = useLoadPoliciesList();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('policies');
  }, [breadcrumbService]);

  return (
    <PolicyListContextProvider>
      <PresentationComponent
        policies={policies || []}
        updatePolicies={resendRequest}
        isLoading={isLoading}
        error={error}
      />
    </PolicyListContextProvider>
  );
};
