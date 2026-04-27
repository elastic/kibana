/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

// Read tools
export const STREAMS_LIST_STREAMS_TOOL_ID = `${internalNamespaces.streams}.list_streams`;
export const STREAMS_GET_STREAM_TOOL_ID = `${internalNamespaces.streams}.get_stream`;
export const STREAMS_GET_SCHEMA_TOOL_ID = `${internalNamespaces.streams}.get_schema`;
export const STREAMS_GET_DATA_QUALITY_TOOL_ID = `${internalNamespaces.streams}.get_data_quality`;
export const STREAMS_GET_LIFECYCLE_STATS_TOOL_ID = `${internalNamespaces.streams}.get_lifecycle_stats`;
export const STREAMS_QUERY_DOCUMENTS_TOOL_ID = `${internalNamespaces.streams}.query_documents`;
export const STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID = `${internalNamespaces.streams}.get_failed_documents`;

export const STREAMS_READ_TOOL_IDS = [
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID,
] as const;

// Write tools
export const STREAMS_SET_RETENTION_TOOL_ID = `${internalNamespaces.streams}.set_retention`;
export const STREAMS_FORK_STREAM_TOOL_ID = `${internalNamespaces.streams}.fork_stream`;
export const STREAMS_DELETE_STREAM_TOOL_ID = `${internalNamespaces.streams}.delete_stream`;
export const STREAMS_UPDATE_PROCESSORS_TOOL_ID = `${internalNamespaces.streams}.update_processors`;
export const STREAMS_MAP_FIELDS_TOOL_ID = `${internalNamespaces.streams}.map_fields`;
export const STREAMS_SET_FAILURE_STORE_TOOL_ID = `${internalNamespaces.streams}.set_failure_store`;
export const STREAMS_UPDATE_DESCRIPTION_TOOL_ID = `${internalNamespaces.streams}.update_stream_description`;

export const STREAMS_WRITE_TOOL_IDS = [
  STREAMS_SET_RETENTION_TOOL_ID,
  STREAMS_FORK_STREAM_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
  STREAMS_UPDATE_PROCESSORS_TOOL_ID,
  STREAMS_MAP_FIELDS_TOOL_ID,
  STREAMS_SET_FAILURE_STORE_TOOL_ID,
  STREAMS_UPDATE_DESCRIPTION_TOOL_ID,
] as const;
