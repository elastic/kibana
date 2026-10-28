/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageTemplate } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';

import { useKibana } from '../shared_imports';

import { APP_CLUSTER_READ_PRIVILEGE, APP_CLUSTER_REQUIRED_PRIVILEGE } from '../../common/constants';

import {
  PipelinesList,
  PipelinesCreate,
  PipelinesEdit,
  PipelinesClone,
  PipelinesCreateFromCsv,
  ManageProcessors,
} from './sections';
import { ROUTES } from './services/navigation';
import { usePipelinesPrivileges } from './hooks';

export const AppWithoutRouter = () => {
  const { services } = useKibana();
  const { canManage } = usePipelinesPrivileges();
  return (
    <Routes>
      <Route exact path={ROUTES.list} component={PipelinesList} />
      {canManage && <Route exact path={ROUTES.clone} component={PipelinesClone} />}
      {canManage && <Route exact path={ROUTES.create} component={PipelinesCreate} />}
      {canManage && <Route exact path={ROUTES.edit} component={PipelinesEdit} />}
      {canManage && <Route exact path={ROUTES.createFromCsv} component={PipelinesCreateFromCsv} />}
      {canManage && services.config.enableManageProcessors && (
        <Route exact path={ROUTES.manageProcessors} component={ManageProcessors} />
      )}
      {/* Catch all */}
      <Route component={PipelinesList} />
    </Routes>
  );
};

export const App: FunctionComponent = () => {
  const { canRead } = usePipelinesPrivileges();
  const { history } = useKibana().services;

  if (!canRead) {
    return (
      <EuiPageTemplate.EmptyPrompt
        iconType="securityApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.ingestPipelines.app.deniedPrivilegeTitle"
              defaultMessage="Cluster privileges required"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.ingestPipelines.app.deniedReadOrManagePrivilegeDescription"
              defaultMessage="To view Ingest Pipelines, you must have the {readPrivilege} cluster privilege. To manage them, you must have the {managePrivilege} cluster privilege."
              values={{
                readPrivilege: APP_CLUSTER_READ_PRIVILEGE,
                managePrivilege: APP_CLUSTER_REQUIRED_PRIVILEGE,
              }}
            />
          </p>
        }
      />
    );
  }

  return (
    <Router history={history}>
      <AppWithoutRouter />
    </Router>
  );
};
