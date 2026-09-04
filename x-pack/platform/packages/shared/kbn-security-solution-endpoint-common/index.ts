/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Single public entry point for this package. Subpath imports are not supported;
// every consumer imports from '@kbn/security-solution-endpoint-common'.
//
// Every export here is named — `export { symbol } from './path'` — never
// `export * from './path'`. The public surface of this package is therefore
// enumerated in this file, and adding a symbol to a source module does not
// silently widen it.
//
// The OpenAPI specs (*.schema.yaml) and the zod schemas generated from them (*.gen.ts)
// deliberately stay in security_solution: the specs are the source of truth for the public
// API documentation, so they belong beside the API they document, and the generated zod
// sits next to its source.

export type { EndpointAuthz, EndpointAuthzKeyList, EndpointPrivileges } from './src/types/authz';

export {
  CANCELLABLE_RESPONSE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
  CONSOLE_RESPONSE_ACTION_COMMANDS,
  DEFAULT_EXECUTE_ACTION_TIMEOUT,
  ECS_OS_TYPE_FIELDS,
  ENABLED_AUTOMATED_RESPONSE_ACTION_COMMANDS,
  ENDPOINT_CAPABILITIES,
  RESPONSE_ACTION_AGENT_TYPE,
  RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP,
  RESPONSE_ACTION_API_COMMANDS_NAMES,
  RESPONSE_ACTION_STATUS,
  RESPONSE_ACTION_TYPE,
  RESPONSE_ACTIONS_ALERT_AGENT_ID_FIELDS,
  RESPONSE_ACTIONS_SUPPORTED_INTEGRATION_TYPES,
  RESPONSE_ACTIONS_ZIP_PASSCODE,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_ENDPOINT_CAPABILITY,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_RBAC_FEATURE_CONTROL,
  RESPONSE_CONSOLE_ACTION_COMMANDS_TO_REQUIRED_AUTHZ,
  RESPONSE_CONSOLE_COMMAND_TO_API_COMMAND_MAP,
  SUPPORTED_AGENT_ID_ALERT_FIELDS,
} from './src/constants';

export type {
  ConsoleResponseActionCommands,
  EnabledAutomatedResponseActionsCommands,
  EndpointCapabilities,
  ResponseActionAgentType,
  ResponseActionsApiCommandNames,
  ResponseActionStatus,
  ResponseActionType,
  ResponseConsoleRbacControls,
} from './src/constants';

export { isActionSupportedByAgentType } from './src/support_map';

export {
  ACTION_AGENT_FILE_DOWNLOAD_ROUTE,
  ACTION_AGENT_FILE_INFO_ROUTE,
  ACTION_DETAILS_ROUTE,
  ACTION_STATE_ROUTE,
  ACTION_STATUS_ROUTE,
  BASE_ENDPOINT_ACTION_ROUTE,
  BASE_ENDPOINT_ROUTE,
  BASE_INTERNAL_ENDPOINT_ROUTE,
  CANCEL_ROUTE,
  EXECUTE_ROUTE,
  GET_FILE_ROUTE,
  GET_PROCESSES_ROUTE,
  ISOLATE_HOST_ROUTE_V2,
  KILL_PROCESS_ROUTE,
  MEMORY_DUMP_ROUTE,
  RUN_SCRIPT_ROUTE,
  SCAN_ROUTE,
  SUSPEND_PROCESS_ROUTE,
  UNISOLATE_HOST_ROUTE_V2,
  UPLOAD_ROUTE,
} from './src/routes';

export { SUPPORTED_HOST_OS_TYPE, type SupportedHostOsType } from './src/os_types';

export {
  AgentTypeSchemaLiteral,
  agentTypesSchema,
  BaseActionRequestSchema,
  HostOsTypeSchemaLiteral,
  MAX_RESPONSE_ACTION_COMMENT_LENGTH,
  NoParametersRequestSchema,
  type BaseActionRequestBody,
} from './src/api/common/base';

export { CancelActionRequestSchema, type CancelActionRequestBody } from './src/api/actions/cancel';
export {
  ExecuteActionRequestSchema,
  type ExecuteActionRequestBody,
} from './src/api/actions/execute';
export {
  EndpointActionGetFileSchema,
  type ResponseActionGetFileRequestBody,
} from './src/api/actions/get_file';
export {
  IsolateRouteRequestSchema,
  type IsolationRouteRequestBody,
} from './src/api/actions/isolate';
export {
  KillProcessRouteRequestSchema,
  type KillProcessRequestBody,
} from './src/api/actions/kill_process';
export {
  MemoryDumpActionRequestSchema,
  type MemoryDumpActionRequestBody,
} from './src/api/actions/memory_dump';
export {
  MSDefenderEndpointRunScriptActionRequestParamsSchema,
  RunScriptActionRequestSchema,
  type EndpointRunScriptActionRequestParams,
  type MSDefenderRunScriptActionRequestParams,
  type RunScriptActionRequestBody,
  type SentinelOneRunScriptActionRequestParams,
} from './src/api/actions/run_script';
export {
  GetProcessesRouteRequestSchema,
  type GetProcessesRequestBody,
} from './src/api/actions/running_procs';
export { ScanActionRequestSchema, type ScanActionRequestBody } from './src/api/actions/scan';
export {
  SuspendProcessRouteRequestSchema,
  type SuspendProcessRequestBody,
} from './src/api/actions/suspend_process';
export {
  UnisolateRouteRequestSchema,
  type UnisolationRouteRequestBody,
} from './src/api/actions/unisolate';
export {
  UploadActionRequestSchema,
  type UploadActionApiRequestBody,
  type UploadActionUIRequestBody,
} from './src/api/actions/upload';
