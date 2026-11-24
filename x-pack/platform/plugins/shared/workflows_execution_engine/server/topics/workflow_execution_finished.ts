/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineTopic } from '@kbn/core/server';
import {
  WORKFLOW_EXECUTION_FINISHED_TOPIC_NAME,
  type WorkflowExecutionFinishedTopic,
} from '@kbn/workflows-topics';

/** Runtime token for {@link WORKFLOW_EXECUTION_FINISHED_TOPIC_NAME}. Consumers define their own. */
export const workflowExecutionFinishedTopic = defineTopic<WorkflowExecutionFinishedTopic>(
  WORKFLOW_EXECUTION_FINISHED_TOPIC_NAME
);
