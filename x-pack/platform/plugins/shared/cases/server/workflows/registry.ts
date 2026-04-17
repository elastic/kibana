/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ServerStepDefinition } from '@kbn/workflows-extensions/server';

import type { CasesClient } from '../client';
import { casesAgentTools } from '../agent_builder/constants';

import { getCaseStepDefinition } from './steps/get_case';
import { createCaseStepDefinition } from './steps/create_case';
import { updateCaseStepDefinition } from './steps/update_case';
import { updateCasesStepDefinition } from './steps/update_cases';
import { addCommentStepDefinition } from './steps/add_comment';
import { findCasesStepDefinition } from './steps/find_cases';
import { deleteCasesStepDefinition } from './steps/delete_cases';
import { unassignCaseStepDefinition } from './steps/unassign_case';
import { addAlertsStepDefinition } from './steps/add_alerts';
import { addEventsStepDefinition } from './steps/add_events';
import { findSimilarCasesStepDefinition } from './steps/find_similar_cases';
import { addObservablesStepDefinition } from './steps/add_observables';
import { addTagsStepDefinition } from './steps/add_tags';
import { getCasesByAlertIdStepDefinition } from './steps/get_cases_by_alert_id';
import { getAllAttachmentsStepDefinition } from './steps/get_all_attachments';
import { updateObservableStepDefinition } from './steps/update_observable';
import { deleteObservableStepDefinition } from './steps/delete_observable';
import { getCasesStepDefinition } from './steps/get_cases';
import {
  assignCaseStepDefinition,
  closeCaseStepDefinition,
  setCategoryStepDefinition,
  setDescriptionStepDefinition,
  setSeverityStepDefinition,
  setStatusStepDefinition,
  setTitleStepDefinition,
} from './steps/simple_steps';

type GetCasesClientFn = (request: KibanaRequest) => Promise<CasesClient>;

export interface CasesStepRegistryEntry {
  /**
   * The agent builder tool ID for this step (platform.core.cases.* namespace).
   * Distinct from the workflow step ID because tool IDs must be all-lowercase.
   */
  toolId: string;
  /** Factory that produces the server-side step definition given a CasesClient factory. */
  factory: (getCasesClient: GetCasesClientFn) => ServerStepDefinition;
  /**
   * Keys from the step's configSchema to surface as tool input parameters.
   * Config fields not listed here stay workflow-only and are omitted from the tool.
   * e.g. `['connector-id']` for createCase so an agent can specify which connector to use.
   */
  agentToolConfigFields?: string[];
}

/**
 * Single source of truth for all active Cases workflow steps.
 *
 * Both workflow step registration and agent builder tool registration consume
 * this registry. Adding a new step here makes it available in both systems
 * automatically.
 */
export const casesStepRegistry: CasesStepRegistryEntry[] = [
  { toolId: casesAgentTools.getCase, factory: getCaseStepDefinition },
  {
    toolId: casesAgentTools.createCase,
    factory: createCaseStepDefinition,
    // connector-id makes sense in agent builder context: the agent can specify
    // which external connector to associate with the newly created case.
    agentToolConfigFields: ['connector-id'],
  },
  { toolId: casesAgentTools.updateCase, factory: updateCaseStepDefinition },
  { toolId: casesAgentTools.updateCases, factory: updateCasesStepDefinition },
  { toolId: casesAgentTools.addComment, factory: addCommentStepDefinition },
  { toolId: casesAgentTools.findCases, factory: findCasesStepDefinition },
  { toolId: casesAgentTools.setSeverity, factory: setSeverityStepDefinition },
  { toolId: casesAgentTools.setStatus, factory: setStatusStepDefinition },
  { toolId: casesAgentTools.closeCase, factory: closeCaseStepDefinition },
  { toolId: casesAgentTools.deleteCases, factory: deleteCasesStepDefinition },
  { toolId: casesAgentTools.assignCase, factory: assignCaseStepDefinition },
  { toolId: casesAgentTools.unassignCase, factory: unassignCaseStepDefinition },
  { toolId: casesAgentTools.addAlerts, factory: addAlertsStepDefinition },
  { toolId: casesAgentTools.addEvents, factory: addEventsStepDefinition },
  { toolId: casesAgentTools.findSimilarCases, factory: findSimilarCasesStepDefinition },
  { toolId: casesAgentTools.setDescription, factory: setDescriptionStepDefinition },
  { toolId: casesAgentTools.setTitle, factory: setTitleStepDefinition },
  { toolId: casesAgentTools.addObservables, factory: addObservablesStepDefinition },
  { toolId: casesAgentTools.addTags, factory: addTagsStepDefinition },
  { toolId: casesAgentTools.setCategory, factory: setCategoryStepDefinition },
  { toolId: casesAgentTools.getCasesByAlertId, factory: getCasesByAlertIdStepDefinition },
  { toolId: casesAgentTools.getAllAttachments, factory: getAllAttachmentsStepDefinition },
  { toolId: casesAgentTools.updateObservable, factory: updateObservableStepDefinition },
  { toolId: casesAgentTools.deleteObservable, factory: deleteObservableStepDefinition },
  { toolId: casesAgentTools.getCases, factory: getCasesStepDefinition },
];
