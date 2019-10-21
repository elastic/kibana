/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Action } from './application/lib/api';

export interface Props {
  action: Action;
  editActionConfig: (property: string, value: any) => void;
  editActionSecrets: (property: string, value: any) => void;
  errors: { [key: string]: string[] };
  hasErrors?: boolean;
}

export interface ActionTypeModel {
  id: string;
  iconClass: string;
  selectMessage: string;
  simulatePrompt: string;
  validate: (action: Action) => any;
  actionFields: React.FunctionComponent<Props> | null;
}
