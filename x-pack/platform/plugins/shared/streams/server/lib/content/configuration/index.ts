/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once, partition } from 'lodash';
import { ContentPackConfiguration } from '@kbn/content-packs-schema';
import { DashboardLink } from '@kbn/streams-plugin/common/assets';
import { Streams, getInheritedFieldsFromAncestors } from '@kbn/streams-schema';
import { AssetClient } from '../../streams/assets/asset_client';
import { ASSET_TYPE } from '../../streams/assets/fields';
import { StreamsClient } from '../../streams/client';
import { getNewFields } from './fields';

export * from './fields';
export * from './processors';

export async function buildUpsertRequest({
  stream,
  streamsClient,
  assetClient,
  entries,
}: {
  stream: Streams.WiredStream.Definition;
  streamsClient: StreamsClient;
  assetClient: AssetClient;
  entries: ContentPackConfiguration[];
}) {
  const dashboardsAndQueries = await assetClient.getAssetLinks(stream.name, ['dashboard', 'query']);

  const [dashboardLinks, queryLinks] = partition(
    dashboardsAndQueries,
    (asset): asset is DashboardLink => asset[ASSET_TYPE] === 'dashboard'
  );

  const dashboards = dashboardLinks.map((dashboard) => dashboard['asset.id']);
  const queries = queryLinks.map((query) => {
    return query.query;
  });

  const getInheritedFields = once(async () => {
    const ancestors = await streamsClient.getAncestors(stream.name);
    return getInheritedFieldsFromAncestors(ancestors);
  });

  const request: Streams.WiredStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      description: stream.description,
      ingest: { ...stream.ingest },
    },
  };

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const type = entry.type;

    switch (type) {
      case 'fields': {
        const inheritedFields = await getInheritedFields();
        const newFields = getNewFields(
          { ...inheritedFields, ...request.stream.ingest.wired.fields },
          entry
        );

        request.stream.ingest.wired.fields = {
          ...request.stream.ingest.wired.fields,
          ...newFields,
        };
        break;
      }

      case 'processors': {
        request.stream.ingest.processing = [...request.stream.ingest.processing, ...entry.content];
        break;
      }

      default:
        missingEntryTypeImpl(type);
    }
  }

  return request;
}

function missingEntryTypeImpl(type: never) {
  throw new Error(`Configuration entry type [${type}] is not implemented`);
}
