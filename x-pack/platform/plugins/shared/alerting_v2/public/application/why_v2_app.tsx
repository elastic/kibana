/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { WhyV2Page } from '../pages/why_v2_page';

export const WhyV2App = () => {
  return (
    <Routes>
      <Route exact path="/">
        <WhyV2Page />
      </Route>
    </Routes>
  );
};
