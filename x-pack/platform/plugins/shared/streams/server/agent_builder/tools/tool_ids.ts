/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';

// Read tools
export const STREAMS_INSPECT_STREAMS_TOOL_ID = `${internalNamespaces.streams}.inspect_streams`;
export const STREAMS_DIAGNOSE_STREAM_TOOL_ID = `${internalNamespaces.streams}.diagnose_stream`;
export const STREAMS_QUERY_DOCUMENTS_TOOL_ID = `${internalNamespaces.streams}.query_documents`;
export const STREAMS_DESIGN_PIPELINE_TOOL_ID = `${internalNamespaces.streams}.design_pipeline`;

export const STREAMS_READ_TOOL_IDS = [
  STREAMS_INSPECT_STREAMS_TOOL_ID,
  STREAMS_DIAGNOSE_STREAM_TOOL_ID,
  STREAMS_QUERY_DOCUMENTS_TOOL_ID,
  STREAMS_DESIGN_PIPELINE_TOOL_ID,
] as const;

// Write tools
export const STREAMS_UPDATE_STREAM_TOOL_ID = `${internalNamespaces.streams}.update_stream`;
export const STREAMS_CREATE_PARTITION_TOOL_ID = `${internalNamespaces.streams}.create_partition`;
export const STREAMS_DELETE_STREAM_TOOL_ID = `${internalNamespaces.streams}.delete_stream`;

export const STREAMS_WRITE_TOOL_IDS = [
  STREAMS_UPDATE_STREAM_TOOL_ID,
  STREAMS_CREATE_PARTITION_TOOL_ID,
  STREAMS_DELETE_STREAM_TOOL_ID,
] as const;
