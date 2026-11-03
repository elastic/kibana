/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';

export type ConnectorTypeAuthType = CreateConnectorTypeRequest['auth']['type'];
export type ConnectorTypeField = CreateConnectorTypeRequest['config'][number];
export type ConnectorTypeAction = CreateConnectorTypeRequest['actions'][string];
export type ConnectorTypeActionScope = ConnectorTypeAction['scope'];
export type ConnectorTypeHttpMethod = ConnectorTypeAction['request']['method'];

export interface ConnectorTypeHeaderRow {
  key: string;
  value: string;
}

/** One action as edited in the form: identified by `name`, headers as rows, body as JSON text. */
export interface ConnectorTypeActionForm {
  name: string;
  description: string;
  scope: ConnectorTypeActionScope;
  input: ConnectorTypeField[];
  request: {
    method: ConnectorTypeHttpMethod;
    url: string;
    path: string;
    headers: ConnectorTypeHeaderRow[];
    body: string;
  };
}

/** Internal shape of the build connector form; serialized to `CreateConnectorTypeRequest` on submit. */
export interface BuildConnectorFormData {
  id: string;
  displayName: string;
  description: string;
  auth: {
    type: ConnectorTypeAuthType;
    headerName?: string;
  };
  config: ConnectorTypeField[];
  actions: ConnectorTypeActionForm[];
}

/** Form paths of the lists edited with `FieldListEditor`. */
export type FieldListPath = 'config' | `actions.${number}.input`;
