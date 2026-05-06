/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import type { DashboardOperation } from '../operations';
import { addMarkdownHandler } from './add_markdown';
import { addPanelsFromAttachmentsHandler } from './add_panels_from_attachments';
import { addSectionHandler } from './add_section';
import { createVisualizationPanelsHandler } from './create_visualization_panels';
import { editVisualizationPanelsHandler } from './edit_visualization_panels';
import { removePanelsHandler } from './remove_panels';
import { removeSectionHandler } from './remove_section';
import { setMetadataHandler } from './set_metadata';
import { updatePanelLayoutsHandler } from './update_panel_layouts';
import type { OperationExecutionContext, OperationHandlerMap } from './types';

export const operationHandlers = {
  set_metadata: setMetadataHandler,
  add_markdown: addMarkdownHandler,
  add_panels_from_attachments: addPanelsFromAttachmentsHandler,
  create_visualization_panels: createVisualizationPanelsHandler,
  edit_visualization_panels: editVisualizationPanelsHandler,
  update_panel_layouts: updatePanelLayoutsHandler,
  add_section: addSectionHandler,
  remove_section: removeSectionHandler,
  remove_panels: removePanelsHandler,
} satisfies OperationHandlerMap;

export const executeOperationHandler = async ({
  dashboardData,
  operation,
  operationIndex,
  context,
}: {
  dashboardData: DashboardAttachmentData;
  operation: DashboardOperation;
  operationIndex: number;
  context: OperationExecutionContext;
}): Promise<DashboardAttachmentData> => {
  switch (operation.operation) {
    case 'set_metadata':
      return operationHandlers.set_metadata({ dashboardData, operation, operationIndex, context });
    case 'add_markdown':
      return operationHandlers.add_markdown({ dashboardData, operation, operationIndex, context });
    case 'add_panels_from_attachments':
      return operationHandlers.add_panels_from_attachments({
        dashboardData,
        operation,
        operationIndex,
        context,
      });
    case 'create_visualization_panels':
      return operationHandlers.create_visualization_panels({
        dashboardData,
        operation,
        operationIndex,
        context,
      });
    case 'edit_visualization_panels':
      return operationHandlers.edit_visualization_panels({
        dashboardData,
        operation,
        operationIndex,
        context,
      });
    case 'update_panel_layouts':
      return operationHandlers.update_panel_layouts({
        dashboardData,
        operation,
        operationIndex,
        context,
      });
    case 'add_section':
      return operationHandlers.add_section({ dashboardData, operation, operationIndex, context });
    case 'remove_section':
      return operationHandlers.remove_section({
        dashboardData,
        operation,
        operationIndex,
        context,
      });
    case 'remove_panels':
      return operationHandlers.remove_panels({ dashboardData, operation, operationIndex, context });
  }
};
