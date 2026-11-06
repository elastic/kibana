/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateConnectorTypeRequest } from '@kbn/actions-plugin/common';

export type ConnectorTypeField = CreateConnectorTypeRequest['config'][number];
export type ConnectorTypeAuthType = Extract<
  CreateConnectorTypeRequest['auth'],
  { type: string }
>['type'];
export type ConnectorTypeFieldFormat = NonNullable<ConnectorTypeField['format']>;
export type ConnectorTypeAction = CreateConnectorTypeRequest['actions'][string];
export type ConnectorTypeActionScope = ConnectorTypeAction['scope'];
export type ConnectorTypeHttpMethod = ConnectorTypeAction['request']['method'];

export interface ConnectorTypeHeaderRow {
  key: string;
  value: string;
}

/** An HTTP request as edited in the form: headers as rows, body as JSON text. */
export interface ConnectorTypeRequestForm {
  method: ConnectorTypeHttpMethod;
  url: string;
  path: string;
  headers: ConnectorTypeHeaderRow[];
  body: string;
}

export interface ConnectorTypeActionForm {
  name: string;
  description: string;
  scope: ConnectorTypeActionScope;
  input: ConnectorTypeField[];
  request: ConnectorTypeRequestForm;
}

/** The optional request that checks a connector of this type; left empty, it is not sent. */
export interface ConnectorTypeTestForm {
  description: string;
  request: ConnectorTypeRequestForm;
}

/** Internal shape of the build connector form; serialized to `CreateConnectorTypeRequest` on submit. */
export interface BuildConnectorFormData {
  id: string;
  displayName: string;
  description: string;
  /** The logo as a base64 `data:` URI; read from `logoUrl` by the server, or imported. */
  icon: string;
  /** Where the logo is loaded from. Only used to load it; never sent. */
  logoUrl: string;
  auth: {
    types: ConnectorTypeAuthType[];
    /** Header carrying the key when `api_key_header` is one of the types. */
    headerName?: string;
  };
  config: ConnectorTypeField[];
  actions: ConnectorTypeActionForm[];
  test: ConnectorTypeTestForm;
}

/** Form paths of a request: an action's or the connection test's. */
export type RequestPath = `actions.${number}.request` | 'test.request';

/** Form paths of the lists edited with `FieldListEditor`. */
export type FieldListPath = 'config' | `actions.${number}.input`;
