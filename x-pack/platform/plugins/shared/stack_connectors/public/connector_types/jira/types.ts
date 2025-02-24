/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserConfiguredActionConnector } from '@kbn/triggers-actions-ui-plugin/public/types';
import type { ExecutorSubActionPushParams } from '../../../server/connector_types/jira/types';

export type JiraActionConnector = UserConfiguredActionConnector<JiraConfig, JiraSecrets>;
export interface JiraActionParams {
  subAction: string;
  /* We override "otherFields" to string because when users fill in the form, the structure won't match until done and
  we need to store the current state. To match with the data structure define in the backend, we make sure users can't
  send the form while not matching the original object structure. */
  subActionParams: ExecutorSubActionPushParams & { incident: { otherFields: string | null } };
}

export interface JiraConfig {
  apiUrl: string;
  projectKey: string;
}

export interface JiraSecrets {
  email: string;
  apiToken: string;
}

export type IssueTypes = Array<{ id: string; name: string }>;

export interface Issue {
  id: string;
  key: string;
  title: string;
}

export interface Fields {
  [key: string]: {
    allowedValues: Array<{ name: string; id: string }> | [];
    defaultValue: { name: string; id: string } | {};
  };
}
