/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Routes } from '@kbn/shared-ux-router';
import { RuleDoctorPage } from '../pages/rule_doctor_page/rule_doctor_page';

export const RuleDoctorApp = () => {
  return (
    <Routes>
      <Route exact path="/">
        <RuleDoctorPage />
      </Route>
    </Routes>
  );
};
