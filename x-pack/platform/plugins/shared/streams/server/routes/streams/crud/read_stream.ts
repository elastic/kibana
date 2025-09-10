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
import type { AssetClient } from '../../../lib/streams/assets/asset_client';
import type { StreamsClient } from '../../../lib/streams/client';
import {
  getDataStreamLifecycle,
  getDataStreamSettings,
  getUnmanagedElasticsearchAssets,
} from '../../../lib/streams/stream_crud';
import { addAliasesForNamespacedFields } from '../../../lib/streams/component_templates/logs_layer';
import type { DashboardLink, RuleLink, QueryLink } from '../../../../common/assets';
import { ASSET_TYPE } from '../../../lib/streams/assets/fields';

export async function readStream({
  name,
  assetClient,
  streamsClient,
  scopedClusterClient,
}: {
  name: string;
  assetClient: AssetClient;
  streamsClient: StreamsClient;
  scopedClusterClient: IScopedClusterClient;
}): Promise<Streams.all.GetResponse> {
  const [streamDefinition, { [name]: assets }] = await Promise.all([
    streamsClient.getStream(name),
    assetClient.getAssetLinks([name], ['dashboard', 'rule', 'query']),
  ]);

  const assetsByType = assets.reduce(
    (acc, asset) => {
      const assetType = asset[ASSET_TYPE];
      if (assetType === 'dashboard') {
        acc.dashboards.push(asset);
      } else if (assetType === 'rule') {
        acc.rules.push(asset);
      } else if (assetType === 'query') {
        acc.queries.push(asset);
      }
      return acc;
    },
    {
      dashboards: [] as DashboardLink[],
      rules: [] as RuleLink[],
      queries: [] as QueryLink[],
    }
  );

  const dashboards = assetsByType.dashboards.map((dashboard) => dashboard['asset.id']);
  const rules = assetsByType.rules.map((rule) => rule['asset.id']);
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

  // These queries are only relavant for IngestStreams
  const [ancestors, dataStream, privileges, dataStreamSettings] = await Promise.all([
    streamsClient.getAncestors(name),
    streamsClient.getDataStream(name).catch((e) => {
      if (isNotFoundError(e)) {
        return null;
      }
      throw e;
    }),
    streamsClient.getPrivileges(name),
    scopedClusterClient.asCurrentUser.indices.getDataStreamSettings({ name }).catch((e) => {
      if (isNotFoundError(e)) {
        return null;
      }
      throw e;
    }),
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
  };

  return body;
}
