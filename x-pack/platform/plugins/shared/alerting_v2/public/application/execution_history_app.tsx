/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { ExecutionHistoryPage } from '../pages/execution_history_page/execution_history_page';

export const ExecutionHistoryApp = () => {
  return (
    <Routes>
      <Route exact path="/">
        <ExecutionHistoryPage />
      </Route>
    </Routes>
  );
};
