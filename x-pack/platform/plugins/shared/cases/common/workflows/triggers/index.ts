/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import { caseCreatedTriggerCommonDefinition } from './case_created';
import { caseUpdatedTriggerCommonDefinition } from './case_updated';
import { commentAddedTriggerCommonDefinition } from './comment_added';

export {
  CaseCreatedTriggerId,
  caseCreatedEventSchema,
  type CaseCreatedEvent,
  caseCreatedTriggerCommonDefinition,
} from './case_created';
export {
  CaseUpdatedTriggerId,
  caseUpdatedEventSchema,
  type CaseUpdatedEvent,
  caseUpdatedTriggerCommonDefinition,
} from './case_updated';
export {
  CommentAddedTriggerId,
  commentAddedEventSchema,
  type CommentAddedEvent,
  commentAddedTriggerCommonDefinition,
} from './comment_added';

export const casesWorkflowTriggers: ReadonlyArray<CommonTriggerDefinition> = Object.freeze([
  caseCreatedTriggerCommonDefinition,
  caseUpdatedTriggerCommonDefinition,
  commentAddedTriggerCommonDefinition,
]);
