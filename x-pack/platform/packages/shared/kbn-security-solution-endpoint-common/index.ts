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
// Still to be lifted by the commits that follow:
//   - route path constants
//   - per-action request schemas (@kbn/config-schema and generated zod)

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
