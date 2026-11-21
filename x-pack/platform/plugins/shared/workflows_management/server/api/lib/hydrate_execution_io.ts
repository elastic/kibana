/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import type { ExecutionsIoClient } from '@kbn/workflows-execution-engine/server/repositories/data_access_layer/implementations/executions_io/executions_io_data_client';

export interface HydrateExecutionIoParams {
  executionsIoDataClient: ExecutionsIoClient;
  stepExecutions?: EsWorkflowStepExecution[];
  includeInput?: boolean;
  includeOutput?: boolean;
  /** `value.<field>` paths. Absent means the whole input or output document. */
  sourceIncludes?: string[];
}

/**
 * Fills requested step input and output values from the executions IO data client.
 * Ids come from the step documents. Missing IO leaves the payload unset.
 */
export async function hydrateExecutionIo({
  executionsIoDataClient,
  stepExecutions = [],
  includeInput = false,
  includeOutput = false,
  sourceIncludes,
}: HydrateExecutionIoParams): Promise<void> {
  const ids: string[] = [];
  for (const step of stepExecutions) {
    if (includeInput && step.inputId) {
      ids.push(step.inputId);
    }
    if (includeOutput && step.outputId) {
      ids.push(step.outputId);
    }
  }
  if (ids.length === 0) {
    return;
  }

  const { items } = sourceIncludes?.length
    ? await executionsIoDataClient.getByIds(ids, { sourceIncludes })
    : await executionsIoDataClient.getByIds(ids);
  const values = new Map(items.map((item) => [item.document.id, item.document.value]));

  for (const step of stepExecutions) {
    if (includeInput && step.inputId && values.has(step.inputId)) {
      step.input = values.get(step.inputId);
    }
    if (includeOutput && step.outputId && values.has(step.outputId)) {
      step.output = values.get(step.outputId);
    }
  }
}
