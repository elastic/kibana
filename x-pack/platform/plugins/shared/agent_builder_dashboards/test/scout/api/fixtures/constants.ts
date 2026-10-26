/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMMON_HEADERS = {
  'kbn-xsrf': 'scout',
  'x-elastic-internal-origin': 'kibana',
  'Content-Type': 'application/json;charset=UTF-8',
  'elastic-api-version': '2023-10-31',
};

export const MCP_PATH = 'api/agent_builder/mcp';
export const TOOLS_PATH = 'api/agent_builder/tools';
export const EXECUTE_TOOL_PATH = `${TOOLS_PATH}/_execute`;
export const DASHBOARDS_PATH = 'api/dashboards';
export const DASHBOARD_APP_PATH = 'internal/dashboards/app';
export const DASHBOARD_APP_API_VERSION = '1';
