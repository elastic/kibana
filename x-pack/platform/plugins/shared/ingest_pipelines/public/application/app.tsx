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

import {
  APP_CAPABILITIES,
  APP_CLUSTER_REQUIRED_PRIVILEGE,
  PLUGIN_ID,
} from '../../common/constants';

import {
  PipelinesList,
  PipelinesCreate,
  PipelinesEdit,
  PipelinesClone,
  PipelinesCreateFromCsv,
  ManageProcessors,
} from './sections';
import { ROUTES } from './services/navigation';

export const AppWithoutRouter = () => {
  const { services } = useKibana();
  return (
    <Routes>
      <Route exact path={ROUTES.list} component={PipelinesList} />
      <Route exact path={ROUTES.clone} component={PipelinesClone} />
      <Route exact path={ROUTES.create} component={PipelinesCreate} />
      <Route exact path={ROUTES.edit} component={PipelinesEdit} />
      <Route exact path={ROUTES.createFromCsv} component={PipelinesCreateFromCsv} />
      {services.config.enableManageProcessors && (
        <Route exact path={ROUTES.manageProcessors} component={ManageProcessors} />
      )}
      {/* Catch all */}
      <Route component={PipelinesList} />
    </Routes>
  );
};

export const App: FunctionComponent = () => {
  const { history, application } = useKibana().services;
  const canManage = application.capabilities[PLUGIN_ID]?.[APP_CAPABILITIES.manage] === true;

  if (!canManage) {
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
              id="xpack.ingestPipelines.app.deniedPrivilegeDescription"
              defaultMessage="To use Ingest Pipelines, you must have the {requiredPrivilege} cluster privilege."
              values={{
                requiredPrivilege: APP_CLUSTER_REQUIRED_PRIVILEGE,
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
