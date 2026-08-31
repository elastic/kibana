/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Public endpoint route paths needed to dispatch and observe response actions.
//
// Internal (`/internal/...`) endpoint routes deliberately stay in security_solution:
// they are not a contract platform consumers should bind to.

/** Location from where all Endpoint related APIs are mounted */
export const BASE_ENDPOINT_ROUTE = '/api/endpoint';

// Location from where all internal Endpoint related APIs are mounted
export const BASE_INTERNAL_ENDPOINT_ROUTE = `/internal${BASE_ENDPOINT_ROUTE}`;

/** Base Actions route. Used to get a list of all actions and is root to other action related routes */
export const BASE_ENDPOINT_ACTION_ROUTE = `${BASE_ENDPOINT_ROUTE}/action`;

/**
 * Response action dispatch routes.
 *
 * Note the path segment does not always match the API command name — the command is
 * `runscript` but the route is `/run_script`, and the command is `running-processes` but
 * the route is `/running_procs`. A route cannot be derived from a command name by string
 * transform; use these constants.
 */
export const ISOLATE_HOST_ROUTE_V2 = `${BASE_ENDPOINT_ACTION_ROUTE}/isolate`;
export const UNISOLATE_HOST_ROUTE_V2 = `${BASE_ENDPOINT_ACTION_ROUTE}/unisolate`;
export const GET_PROCESSES_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/running_procs`;
export const KILL_PROCESS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/kill_process`;
export const SUSPEND_PROCESS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/suspend_process`;
export const GET_FILE_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/get_file`;
export const EXECUTE_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/execute`;
export const UPLOAD_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/upload`;
export const SCAN_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/scan`;
export const RUN_SCRIPT_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/run_script`;
export const MEMORY_DUMP_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/memory_dump`;
export const CANCEL_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/cancel`;

/** Endpoint Actions Routes */
export const ACTION_STATUS_ROUTE = `${BASE_ENDPOINT_ROUTE}/action_status`;
export const ACTION_DETAILS_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/{action_id}`;
export const ACTION_AGENT_FILE_INFO_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/{action_id}/file/{file_id}`;
export const ACTION_AGENT_FILE_DOWNLOAD_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/{action_id}/file/{file_id}/download`;
export const ACTION_STATE_ROUTE = `${BASE_ENDPOINT_ACTION_ROUTE}/state`;
