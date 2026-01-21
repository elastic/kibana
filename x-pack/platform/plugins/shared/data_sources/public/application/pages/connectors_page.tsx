/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { DataSourcesView } from '../components/connectors_view';
import { useBreadcrumbs } from '../hooks/use_breadcrumbs';

export const DataSourcesPage: React.FC = () => {
  useBreadcrumbs([]);
  return <DataSourcesView />;
};
