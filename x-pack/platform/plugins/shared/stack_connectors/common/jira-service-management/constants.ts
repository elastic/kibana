/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const JIRA_SERVICE_MANAGEMENT_CONNECTOR_TYPE_ID = '.jira-service-management';
export const RULE_TAGS_TEMPLATE = `{{rule.tags}}`;

export enum JiraServiceManagementSubActions {
  CreateAlert = 'createAlert',
  CloseAlert = 'closeAlert',
}
