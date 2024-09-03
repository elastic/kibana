/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LogCategory } from '../../types';
import { LogCategoriesGrid, LogCategoriesGridDependencies } from './log_categories_grid';

export interface LogCategoriesResultContentProps {
  dependencies: LogCategoriesResultContentDependencies;
  logCategories: LogCategory[];
}

export type LogCategoriesResultContentDependencies = LogCategoriesGridDependencies;

export const LogCategoriesResultContent: React.FC<LogCategoriesResultContentProps> = ({
  dependencies,
  logCategories,
}) => {
  return (
    <div>
      <LogCategoriesGrid dependencies={dependencies} logCategories={logCategories} />
    </div>
  );
};
