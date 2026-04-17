/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const casesTool = <TName extends string>(toolName: TName): `platform.core.cases.${TName}` =>
  `platform.core.cases.${toolName}`;

/**
 * Ids of built-in agent builder tools for the Cases plugin.
 * All IDs live under the `platform.core.cases.*` protected namespace.
 *
 * Naming convention: take the workflow step ID suffix, convert camelCase → snake_case.
 *   e.g. cases.getCase → platform.core.cases.get_case
 */
export const casesAgentTools = {
  getCase: casesTool('get_case'),
  getCases: casesTool('get_cases'),
  getCasesByAlertId: casesTool('get_cases_by_alert_id'),
  createCase: casesTool('create_case'),
  updateCase: casesTool('update_case'),
  updateCases: casesTool('update_cases'),
  deleteCases: casesTool('delete_cases'),
  findCases: casesTool('find_cases'),
  findSimilarCases: casesTool('find_similar_cases'),
  addComment: casesTool('add_comment'),
  addAlerts: casesTool('add_alerts'),
  addEvents: casesTool('add_events'),
  addObservables: casesTool('add_observables'),
  addTags: casesTool('add_tags'),
  getAllAttachments: casesTool('get_all_attachments'),
  assignCase: casesTool('assign_case'),
  unassignCase: casesTool('unassign_case'),
  closeCase: casesTool('close_case'),
  setTitle: casesTool('set_title'),
  setDescription: casesTool('set_description'),
  setSeverity: casesTool('set_severity'),
  setStatus: casesTool('set_status'),
  setCategory: casesTool('set_category'),
  updateObservable: casesTool('update_observable'),
  deleteObservable: casesTool('delete_observable'),
} as const;
