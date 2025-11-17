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
} from '@kbn/streams-schema';
import type { IScopedClusterClient } from '@kbn/core/server';
import { isNotFoundError } from '@kbn/es-errors';
import { findInheritedFailureStore } from '@kbn/streams-schema/src/helpers/lifecycle';
import type { DataStreamWithFailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import type { AttachmentClient } from '../../../lib/streams/attachments/attachment_client';
import type { AssetClient } from '../../../lib/streams/assets/asset_client';
import type { StreamsClient } from '../../../lib/streams/client';
import {
  getDataStreamLifecycle,
  getFailureStore,
  getDataStreamSettings,
  getUnmanagedElasticsearchAssets,
} from '../../../lib/streams/stream_crud';
import { addAliasesForNamespacedFields } from '../../../lib/streams/component_templates/logs_layer';
import type { QueryLink } from '../../../../common/assets';
import { ASSET_TYPE } from '../../../lib/streams/assets/fields';

export async function readStream({
  name,
  assetClient,
  attachmentClient,
  streamsClient,
  scopedClusterClient,
}: {
  name: string;
  assetClient: AssetClient;
  attachmentClient: AttachmentClient;
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
}): Promise<Streams.all.GetResponse> {
  const [streamDefinition, { [name]: assets }, attachments] = await Promise.all([
    streamsClient.getStream(name),
    assetClient.getAssetLinks([name], ['query']),
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

  const assetsByType = assets.reduce(
    (acc, asset) => {
      const assetType = asset[ASSET_TYPE];
      if (assetType === 'query') {
        acc.queries.push(asset);
      }
      return acc;
    },
    {
      queries: [] as QueryLink[],
    }
  );

  const queries = assetsByType.queries.map((query) => {
    return query.query;
  });

  if (Streams.GroupStream.Definition.is(streamDefinition)) {
    return {
      stream: streamDefinition,
      dashboards,
      rules,
      queries,
    };
  }

  const privileges = await streamsClient.getPrivileges(name);

  // These queries are only relavant for IngestStreams
  const [ancestors, dataStream, dataStreamSettings] = await Promise.all([
    streamsClient.getAncestors(name),
    privileges.view_index_metadata
      ? streamsClient.getDataStream(name).catch((e) => {
          if (isNotFoundError(e)) {
            return null;
          }
          throw e;
        })
      : Promise.resolve(null),
    privileges.view_index_metadata
      ? scopedClusterClient.asCurrentUser.indices.getDataStreamSettings({ name }).catch((e) => {
          if (isNotFoundError(e)) {
            return null;
          }
          throw e;
        })
      : Promise.resolve(null),
  ]);

  if (Streams.ClassicStream.Definition.is(streamDefinition)) {
    return {
      stream: streamDefinition,
      privileges,
      elasticsearch_assets:
        dataStream && privileges.manage
          ? await getUnmanagedElasticsearchAssets({
              dataStream,
              scopedClusterClient,
            })
          : undefined,
      data_stream_exists: !!dataStream,
      effective_lifecycle: getDataStreamLifecycle(dataStream),
      effective_settings: getDataStreamSettings(dataStreamSettings?.data_streams[0]),
      dashboards,
      rules,
      queries,
      effective_failure_store: getFailureStore({
        dataStream: dataStream as unknown as DataStreamWithFailureStore,
      }),
    } satisfies Streams.ClassicStream.GetResponse;
  }

  const inheritedFields = addAliasesForNamespacedFields(
    streamDefinition,
    getInheritedFieldsFromAncestors(ancestors)
  );

  const body: Streams.WiredStream.GetResponse = {
    stream: streamDefinition,
    dashboards,
    rules,
    privileges,
    queries,
    effective_lifecycle: findInheritedLifecycle(streamDefinition, ancestors),
    effective_settings: getInheritedSettings([...ancestors, streamDefinition]),
    inherited_fields: inheritedFields,
    effective_failure_store: findInheritedFailureStore(streamDefinition, ancestors),
  };
  return body;
}
