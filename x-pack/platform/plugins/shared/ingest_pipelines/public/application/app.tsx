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

import { APP_CLUSTER_MANAGE_PRIVILEGES, APP_CLUSTER_READ_PRIVILEGES } from '../../common/constants';

import { SectionError, useAuthorizationContext, SectionLoading } from '../shared_imports';

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
  const { apiError, isLoading } = useAuthorizationContext();
  const { canRead } = usePipelinesPrivileges();
  const { history } = useKibana().services;

  if (apiError) {
    return (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.ingestPipelines.app.checkingPrivilegesErrorMessage"
            defaultMessage="Error fetching user privileges from the server."
          />
        }
        error={apiError}
      />
    );
  }

  if (isLoading) {
    return (
      <SectionLoading>
        <FormattedMessage
          id="xpack.ingestPipelines.app.checkingPrivilegesDescription"
          defaultMessage="Checking privileges…"
        />
      </SectionLoading>
    );
  }

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
              defaultMessage="To view Ingest Pipelines, you must have the {readPrivileges} cluster privilege. To manage them, you must have {managePrivileges}."
              values={{
                readPrivileges: APP_CLUSTER_READ_PRIVILEGES.join(', '),
                managePrivileges: APP_CLUSTER_MANAGE_PRIVILEGES.join(', '),
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
