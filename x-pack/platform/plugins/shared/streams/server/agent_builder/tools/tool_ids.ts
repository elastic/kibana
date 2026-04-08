/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

export const STREAMS_LIST_STREAMS_TOOL_ID = `${internalNamespaces.streams}.list_streams`;
export const STREAMS_GET_STREAM_TOOL_ID = `${internalNamespaces.streams}.get_stream`;
export const STREAMS_GET_SCHEMA_TOOL_ID = `${internalNamespaces.streams}.get_schema`;
export const STREAMS_GET_DATA_QUALITY_TOOL_ID = `${internalNamespaces.streams}.get_data_quality`;
export const STREAMS_GET_LIFECYCLE_STATS_TOOL_ID = `${internalNamespaces.streams}.get_lifecycle_stats`;
export const STREAMS_QUERY_DOCUMENTS_TOOL_ID = `${internalNamespaces.streams}.query_documents`;
export const STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID = `${internalNamespaces.streams}.get_failed_documents`;

export const STREAMS_TOOL_IDS = [
  STREAMS_LIST_STREAMS_TOOL_ID,
  STREAMS_GET_STREAM_TOOL_ID,
  STREAMS_GET_SCHEMA_TOOL_ID,
  STREAMS_GET_DATA_QUALITY_TOOL_ID,
  STREAMS_GET_LIFECYCLE_STATS_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_GET_FAILED_DOCUMENTS_TOOL_ID,
] as const;
