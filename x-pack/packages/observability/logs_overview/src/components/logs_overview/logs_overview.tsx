/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogCategories, LogCategoriesDependencies } from '../log_categories';

export interface LogsOverviewProps {
  dependencies: LogsOverviewDependencies;
}

export type LogsOverviewDependencies = LogCategoriesDependencies;

export const LogsOverview: React.FC<LogsOverviewProps> = ({ dependencies }) => {
  // TODO: pass the right props
  return <LogCategories dependencies={dependencies} />;
};
