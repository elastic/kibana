/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { z } from '@kbn/zod/v4';
import { addControlsOperation } from './add_controls';
import { addPanelsOperation } from './add_panels';
import { editPanelsOperation } from './edit_panels';
import { normalizePanelsOperation } from './normalize_panels';
import { removeControlsOperation } from './remove_controls';
import { removePanelsOperation } from './remove_panels';
import { setLayoutOperation } from './set_layout';
import { setMetadataOperation } from './set_metadata';
import type { OperationExecutionContext } from './types';
import { resolvePanelCreationRequests } from './panel_creation';

const operationDefinitions = [
  setMetadataOperation,
  addPanelsOperation,
  editPanelsOperation,
  normalizePanelsOperation,
  setLayoutOperation,
  removePanelsOperation,
  addControlsOperation,
  removeControlsOperation,
] as const;

const schemas = operationDefinitions.map((definition) => definition.schema);

export const dashboardOperationSchema = z.discriminatedUnion(
  'operation',
  schemas as unknown as [(typeof schemas)[number], ...(typeof schemas)[number][]]
);

export type DashboardOperation = z.infer<typeof dashboardOperationSchema>;

const operationName = (schema: { shape?: { operation?: { value?: string } } }): string => {
  const value = schema.shape?.operation?.value;
  if (!value) {
    throw new Error('Operation schema is missing an operation literal.');
  }
  return value;
};

const operationDefinitionByType = new Map(
  operationDefinitions.map((definition) => [operationName(definition.schema), definition])
);

interface PrepareOperationExecutionParams {
  operations: DashboardOperation[];
  logger: OperationExecutionContext['logger'];
  failures: OperationExecutionContext['failures'];
  panelAuthoringNotes: OperationExecutionContext['panelAuthoringNotes'];
  resolvePanelContent?: OperationExecutionContext['resolvePanelContent'];
  resolveCustomContentTemplate?: OperationExecutionContext['resolveCustomContentTemplate'];
}

export const prepareOperationExecution = async ({
  operations,
  logger,
  failures,
  panelAuthoringNotes,
  resolvePanelContent,
  resolveCustomContentTemplate,
}: PrepareOperationExecutionParams): Promise<OperationExecutionContext> => {
  const resolvedPanelCreationRequests = await resolvePanelCreationRequests({
    operations,
    resolvePanelContent,
  });

  return {
    logger,
    failures,
    panelAuthoringNotes,
    resolvedPanelCreationRequests,
    resolvePanelContent,
    resolveCustomContentTemplate,
    panelKeys: new Map(),
    normalizeChanges: [],
    normalizeSkipped: [],
    touchedRequestPanelData: false,
    unspecifiedGridPanelIds: new Set(),
    layoutWarnings: [],
    layoutRows: [],
  };
};

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
  const definition = operationDefinitionByType.get(operation.operation);
  if (!definition) {
    throw new Error(`No handler for ${operation.operation}`);
  }

  return definition.handler({ dashboardData, operation, operationIndex, context });
};
