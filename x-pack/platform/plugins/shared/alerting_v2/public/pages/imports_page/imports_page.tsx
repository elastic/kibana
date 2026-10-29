/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useBreadcrumbs } from '../../hooks/use_breadcrumbs';
import { ImportsTable } from './components/imports_table';

/** POC: Import alerts. */
export const ImportsPage = () => {
  useBreadcrumbs('imports_list');

  return <ImportsTable />;
};
