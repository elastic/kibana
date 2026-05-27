/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Streams,
  findInheritedLifecycle,
  getInheritedFieldsFromAncestors,
  getInheritedSettings,
  findInheritedFailureStore,
  getRoot,
  LOGS_ECS_STREAM_NAME,
} from '@kbn/streams-schema';
import type { IScopedClusterClient, Logger } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import type {
  DataStreamWithFailureStore,
  WiredIngestStreamEffectiveFailureStore,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { AttachmentClient } from '../../../lib/streams/attachments/attachment_client';
import type { QueryClient } from '../../../lib/streams/assets/query/query_client';
import type { StreamsClient } from '../../../lib/streams/client';
import {
  getDataStreamLifecycle,
  getFailureStore,
  getDataStreamSettings,
  getUnmanagedElasticsearchAssets,
} from '../../../lib/streams/stream_crud';
import { addAliasesForNamespacedFields } from '../../../lib/streams/component_templates/logs_layer';
import { getEsqlView } from '../../../lib/streams/esql_views/manage_esql_views';

export async function readStream({
  name,
  queryClient,
  attachmentClient,
  streamsClient,
  scopedClusterClient,
  logger,
}: {
  name: string;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
  logger: Logger;
}): Promise<Streams.all.GetResponse> {
  const [streamDefinition, { [name]: queryLinks }, attachments] = await Promise.all([
    streamsClient.getStream(name),
    queryClient.getStreamToQueryLinksMap([name]),
    attachmentClient.getAttachments(name),
  ]);

  const { dashboards, rules } = attachments.reduce(
    (acc, attachment) => {
      if (attachment.type === 'dashboard') {
        acc.dashboards.push(attachment.id);
      } else if (attachment.type === 'rule') {
        acc.rules.push(attachment.id);
      }
      return acc;
    },
    { dashboards: [] as string[], rules: [] as string[] }
  );

  const queries = queryLinks.map((query) => {
    return query.query;
  });

  if (Streams.QueryStream.Definition.is(streamDefinition)) {
    // Fetch the actual ES|QL from the view (source of truth)
    const esqlView = await getEsqlView({
      esClient: scopedClusterClient.asCurrentUser,
      logger,
      name: streamDefinition.query.view,
    });

    // Build response with both view reference and resolved esql
    // query_streams is already part of the stream definition (from BaseStream.Definition)
    const queryStreamResponse: Streams.QueryStream.GetResponse = {
      stream: {
        ...streamDefinition,
        query: {
          view: streamDefinition.query.view,
          esql: esqlView.query,
        },
      },
      dashboards,
      rules,
      queries,
      inherited_fields: {},
    };

    return queryStreamResponse;
  }

  const privileges = await streamsClient.getPrivileges(name);

  // These queries are only relavant for IngestStreams
  const [ancestors, dataStream] = await Promise.all([
    streamsClient.getAncestors(name),
    privileges.view_index_metadata
      ? streamsClient.getDataStream(name).catch((e) => {
          if (isNotFoundError(e)) {
            return null;
          }
          throw e;
        })
      : Promise.resolve(null),
  ]);

  // Skip getDataStreamSettings for replicated data streams — they have no local
  // index template and the ES API returns HTTP 400 in that case.
  const dataStreamSettings =
    privileges.view_index_metadata && !dataStream?.replicated
      ? await scopedClusterClient.asCurrentUser.indices
          .getDataStreamSettings({ name })
          .catch((e) => {
            if (isNotFoundError(e)) {
              return null;
            }
            throw e;
          })
      : null;

  if (Streams.ClassicStream.Definition.is(streamDefinition)) {
    return {
      stream: streamDefinition,
      privileges,
      index_mode: dataStream?.index_mode,
      replicated: dataStream?.replicated ?? false,
      elasticsearch_assets:
        dataStream && privileges.manage && dataStream.replicated !== true
          ? await getUnmanagedElasticsearchAssets({
              dataStream,
              esClient: scopedClusterClient.asCurrentUser,
            })
          : undefined,
      data_stream_exists: !!dataStream,
      effective_lifecycle: getDataStreamLifecycle(dataStream),
      effective_settings: getDataStreamSettings(dataStreamSettings?.data_streams[0]),
      dashboards,
      rules,
      queries,
      effective_failure_store: getFailureStore({
        dataStream: dataStream as DataStreamWithFailureStore,
      }),
    } satisfies Streams.ClassicStream.GetResponse;
  }

  // For OTEL-based streams (logs, logs.otel), process inherited fields to add OTEL aliases
  // For ECS streams (logs.ecs), use inherited fields directly without OTEL-specific processing
  const rootStream = getRoot(streamDefinition.name);
  const isEcsStream = rootStream === LOGS_ECS_STREAM_NAME;

  const inheritedFields = isEcsStream
    ? getInheritedFieldsFromAncestors(ancestors)
    : addAliasesForNamespacedFields(streamDefinition, getInheritedFieldsFromAncestors(ancestors));

  const inheritedFailureStore = findInheritedFailureStore(streamDefinition, ancestors);

  const effectiveFailureStore: WiredIngestStreamEffectiveFailureStore = dataStream
    ? {
        ...getFailureStore({ dataStream: dataStream as DataStreamWithFailureStore }),
        from: inheritedFailureStore.from,
      }
    : inheritedFailureStore;

  const body: Streams.WiredStream.GetResponse = {
    stream: streamDefinition,
    dashboards,
    rules,
    privileges,
    queries,
    index_mode: dataStream?.index_mode,
    replicated: dataStream?.replicated ?? false,
    data_stream_exists: !!dataStream,
    effective_lifecycle: findInheritedLifecycle(streamDefinition, ancestors),
    effective_settings: getInheritedSettings([...ancestors, streamDefinition]),
    inherited_fields: inheritedFields,
    effective_failure_store: effectiveFailureStore,
  };
  return body;
}
