/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AlertsDataGridProps } from '../types';
import { AlertsDataGrid } from '../application/sections/alerts_table/alerts_data_grid';

export const getAlertsTableLazy = (props: AlertsDataGridProps) => {
  return <AlertsDataGrid {...props} />;
};
