/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';

import { ScopedHistory } from '@kbn/core/public';
import useObservable from 'react-use/lib/useObservable';
import { APP_WRAPPER_CLASS, useExecutionContext } from '../../../../shared_imports';
import { breadcrumbService, IndexManagementBreadcrumb } from '../../../services/breadcrumbs';
import { useAppContext } from '../../../app_context';
import { IndexTable } from './index_table';

export const IndexList: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const {
    core: { executionContext, chrome },
    services: { extensionsService },
    plugins: { cloud },
  } = useAppContext();

  useExecutionContext(executionContext, {
    type: 'application',
    page: 'indexManagementIndicesTab',
  });
  const activeSolutionId = useObservable(chrome.getActiveSolutionNavId$());
  useEffect(() => {
    if (cloud?.isServerlessEnabled) {
      breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indices);
    } else {
      if (activeSolutionId === 'es') {
        breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indicesList);
      } else {
        breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.indices);
      }
    }
  }, [activeSolutionId, cloud]);

  return (
    <div className={`${APP_WRAPPER_CLASS} im-snapshotTestSubject`} data-test-subj="indicesList">
      <IndexTable history={history as ScopedHistory} />
    </div>
  );
};
