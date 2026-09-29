/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import { routeToRules } from '../../constants';
import { RulesPageActionsProvider } from './rules_page_actions';
import { RulesListContainer } from '../rules_list/rules_list_page';
import { LogsListContainer } from '../logs_list/logs_list_page';

/*
 * Some consumers are still using /rules. This contains a temporary redirect to /.
 */
const RulesPage = () => {
  return (
    <RulesPageActionsProvider>
      <Routes>
        <Route exact path="/logs" component={LogsListContainer} />
        <Route exact path="/" component={RulesListContainer} />
        <Redirect exact from={routeToRules} to="/" />
      </Routes>
    </RulesPageActionsProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default RulesPage;
