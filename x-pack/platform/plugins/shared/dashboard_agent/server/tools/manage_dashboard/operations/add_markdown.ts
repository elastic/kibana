/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { appendPanelsToDashboard } from '../dashboard_state';
import type { OperationHandler } from './types';

export const addMarkdownHandler: OperationHandler<'add_markdown'> = ({
  dashboardData,
  operation,
}) => {
  const markdownPanel = {
    type: MARKDOWN_EMBEDDABLE_TYPE,
    config: { content: operation.markdownContent },
    grid: operation.grid,
    id: uuidv4(),
  };

  return appendPanelsToDashboard({
    dashboardData,
    panelsToAdd: [markdownPanel],
    sectionId: operation.sectionId,
  });
};
