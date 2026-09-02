/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';
import { RulesPageActionsProvider } from './rules_page_actions';
import { RulesListContainer } from '../rules_list/rules_list_page';
import { LogsListContainer } from '../logs_list/logs_list_page';

const RulesPage = () => {
  return (
    <RulesPageActionsProvider>
      <Routes>
        <Route exact path="/logs" component={LogsListContainer} />
        <Route exact path="/" component={RulesListContainer} />
      </Routes>
    </RulesPageActionsProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export default RulesPage;
