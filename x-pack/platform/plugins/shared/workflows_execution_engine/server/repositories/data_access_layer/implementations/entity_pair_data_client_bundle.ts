/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution, EsWorkflowStepExecution } from '@kbn/workflows';
import {
  STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
  WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
} from './data_stream/data_stream_definitions';
import { DataStreamEntityLifecycle } from './data_stream/data_stream_entity_lifecycle';
import { PlainIndexEntityLifecycle } from './plain_index/plain_index_entity_lifecycle';
import {
  WORKFLOWS_EXECUTIONS_INDEX,
  WORKFLOWS_STEP_EXECUTIONS_INDEX,
} from '../constants/execution_indexes';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/step_executions_mappings';
import { WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS } from '../mappings/workflow_executions_mappings';
import type {
  DataClientBundle,
  EntityLifecycle,
  ExecutionStorageSource,
  StepExecutionsDataClient,
  WorkflowExecutionsDataClient,
} from '../types';

export interface EntityPairDataClientBundleDeps {
  dataRetention: string;
  logger: Logger;
}

interface EntityPair {
  workflow: EntityLifecycle<WorkflowExecutionsDataClient>;
  step: EntityLifecycle<StepExecutionsDataClient>;
}

const createEntityPair = (
  source: ExecutionStorageSource,
  deps: EntityPairDataClientBundleDeps
): EntityPair => {
  const { logger, dataRetention } = deps;
  switch (source) {
    case 'plain_index':
      return {
        workflow: new PlainIndexEntityLifecycle<EsWorkflowExecution>({
          logger,
          indexName: WORKFLOWS_EXECUTIONS_INDEX,
          mappings: WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
        }),
        step: new PlainIndexEntityLifecycle<EsWorkflowStepExecution>({
          logger,
          indexName: WORKFLOWS_STEP_EXECUTIONS_INDEX,
          mappings: WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
        }),
      };
    case 'data_stream':
      return {
        workflow: new DataStreamEntityLifecycle<EsWorkflowExecution>({
          logger,
          dataRetention,
          definition: WORKFLOW_EXECUTIONS_DATA_STREAM_DEFINITION,
          dateField: 'createdAt',
          additionalIndexesToQuery: ['.workflows-executions'],
        }),
        step: new DataStreamEntityLifecycle<EsWorkflowStepExecution>({
          logger,
          dataRetention,
          definition: STEP_EXECUTIONS_DATA_STREAM_DEFINITION,
          dateField: 'startedAt',
          additionalIndexesToQuery: ['.workflows-step-executions'],
        }),
      };
    default: {
      const unexpected: never = source;
      throw new Error(`Unsupported storage source: ${unexpected}`);
    }
  }
};

/** Workflow and step entity clients for one storage source. */
export class EntityPairDataClientBundle implements DataClientBundle {
  private readonly workflow: EntityLifecycle<WorkflowExecutionsDataClient>;
  private readonly step: EntityLifecycle<StepExecutionsDataClient>;

  constructor(source: ExecutionStorageSource, deps: EntityPairDataClientBundleDeps) {
    const pair = createEntityPair(source, deps);
    this.workflow = pair.workflow;
    this.step = pair.step;
  }

  initSetup(coreSetup: CoreSetup): Promise<void> {
    return Promise.all([this.workflow.initSetup(coreSetup), this.step.initSetup(coreSetup)]).then(
      () => undefined
    );
  }

  initStart(coreStart: CoreStart): Promise<void> {
    return Promise.all([this.workflow.initStart(coreStart), this.step.initStart(coreStart)]).then(
      () => undefined
    );
  }

  stop(): Promise<void> {
    return Promise.all([this.workflow.stop(), this.step.stop()]).then(() => undefined);
  }

  createWorkflowDataClient(): WorkflowExecutionsDataClient {
    return this.workflow.createClient();
  }

  createStepDataClient(): StepExecutionsDataClient {
    return this.step.createClient();
  }
}