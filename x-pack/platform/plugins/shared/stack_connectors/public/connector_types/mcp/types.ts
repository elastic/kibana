/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionTypeModel, InternalConnectorForm } from '@kbn/alerts-ui-shared';
import type { CallToolParams, SUB_ACTION } from '@kbn/connector-schemas/mcp';
import type { Config, Secrets } from '@kbn/connector-schemas/mcp';

export type MCPConnector = ActionTypeModel<Config, Secrets, MCPActionParams>;

export interface MCPInitializeActionParams {
  subAction: SUB_ACTION.INITIALIZE;
  subActionParams: never;
}

export interface MCPListToolsActionParams {
  subAction: SUB_ACTION.LIST_TOOLS;
  subActionParams: never;
}

export interface MCPCallToolActionParams {
  subAction: SUB_ACTION.CALL_TOOL;
  subActionParams: CallToolParams;
}

export interface SubActionParamsRaw {
  subActionParamsRaw?: string;
}

export type MCPActionParams = (
  | MCPInitializeActionParams
  | MCPListToolsActionParams
  | MCPCallToolActionParams
) &
  SubActionParamsRaw;

export type MCPInternalConnectorForm = InternalConnectorForm & {
  __internal__?: InternalConnectorForm['__internal__'] & {
    hasHeaders?: boolean;
  };
};

export interface HeaderField {
  key: string;
  value: string;
  type: HeaderFieldType;
}

export enum HeaderFieldType {
  CONFIG = 'config',
  SECRET = 'secret',
}
