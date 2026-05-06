/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/dashboard-agent-common';
import { z } from '@kbn/zod/v4';
import { addMarkdownOperation } from './add_markdown';
import { addPanelsFromAttachmentsOperation } from './add_panels_from_attachments';
import { addSectionOperation } from './add_section';
import { createVisualizationPanelsOperation } from './create_visualization_panels';
import { editVisualizationPanelsOperation } from './edit_visualization_panels';
import { removePanelsOperation } from './remove_panels';
import { removeSectionOperation } from './remove_section';
import { setMetadataOperation } from './set_metadata';
import type { OperationExecutionContext, OperationHandler } from './types';
import { updatePanelLayoutsOperation } from './update_panel_layouts';
import type { VisualizationCreationRequest } from './visualization_creation';

const operationDefinitions = [
  setMetadataOperation,
  addMarkdownOperation,
  addPanelsFromAttachmentsOperation,
  createVisualizationPanelsOperation,
  editVisualizationPanelsOperation,
  updatePanelLayoutsOperation,
  addSectionOperation,
  removeSectionOperation,
  removePanelsOperation,
] as const;

const schemas = operationDefinitions.map((definition) => definition.schema);

export const dashboardOperationSchema = z.discriminatedUnion(
  'operation',
  schemas as unknown as [(typeof schemas)[number], ...(typeof schemas)[number][]]
);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

type AnyVisualizationCreationCollector = (
  operation: DashboardOperation
) => VisualizationCreationRequest[];

type AnyOperationHandler = OperationHandler<DashboardOperation>;

const handlerByType = new Map(
  operationDefinitions.map((definition) => [
    definition.schema.shape.operation.value,
    definition.handler,
  ])
);

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
  const handler = handlerByType.get(operation.operation) as AnyOperationHandler | undefined;
  if (!handler) {
    throw new Error(`No handler for ${operation.operation}`);
  }

  return handler({ dashboardData, operation, operationIndex, context });
};

const visualizationCreationCollectorByType = new Map(
  operationDefinitions.flatMap((definition) =>
    definition.collectVisualizationCreationRequests
      ? [
          [
            definition.schema.shape.operation.value,
            definition.collectVisualizationCreationRequests,
          ] as const,
        ]
      : []
  )
);

export const collectVisualizationCreationRequests = (
  operations: DashboardOperation[]
): Map<number, VisualizationCreationRequest[]> => {
  const requestsByOperationIndex = new Map<number, VisualizationCreationRequest[]>();

  for (const [operationIndex, operation] of operations.entries()) {
    const collect = visualizationCreationCollectorByType.get(operation.operation) as
      | AnyVisualizationCreationCollector
      | undefined;
    if (!collect) {
      continue;
    }

    const requests = collect(operation);
    if (requests.length > 0) {
      requestsByOperationIndex.set(operationIndex, requests);
    }
  }

  return requestsByOperationIndex;
};
