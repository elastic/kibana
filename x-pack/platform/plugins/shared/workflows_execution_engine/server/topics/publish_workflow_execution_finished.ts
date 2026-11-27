/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger, PubSubStart } from '@kbn/core/server';
import type { WorkflowExecutionFinishedData } from '@kbn/workflows-topics';
import { workflowExecutionFinishedTopic } from './workflow_execution_finished';

interface WorkflowExecutionFinishedPublisher {
  pubsub: Pick<PubSubStart, 'publish'>;
  logger: Logger;
}

let activePublisher: WorkflowExecutionFinishedPublisher | undefined;

/** Installed from plugin start and cleared on stop. Unset, publish is a no-op. */
export const setWorkflowExecutionFinishedPublisher = (
  publisher: WorkflowExecutionFinishedPublisher | undefined
): void => {
  activePublisher = publisher;
};

/** Publishes a terminal execution. A missing publisher or a rejected publish does not throw. */
export const publishWorkflowExecutionFinished = async (
  data: WorkflowExecutionFinishedData
): Promise<void> => {
  const publisher = activePublisher;
  if (!publisher) {
    return;
  }

  try {
    await publisher.pubsub.publish(workflowExecutionFinishedTopic, {
      id: data.executionId,
      data,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    publisher.logger.warn(
      `Failed to publish workflow execution finished (execution=${data.executionId}): ${detail}`
    );
  }
};
