/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badData } from '@hapi/boom';
import type { StreamQuery, WiredIngestUpsertRequest } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import type { ClassicIngestUpsertRequest } from '@kbn/streams-schema';
import type { UpsertStreamResponse } from '../client';
import type { StreamsClient } from '../client';
import type { AttachmentClient } from '../attachments/attachment_client';
import type { QueryClient } from '../assets/query/query_client';
import { ASSET_TYPE } from '../assets/fields';
import type { Query } from '../../../../common/queries';

export async function getStreamAssets({
  name,
  queryClient,
  attachmentClient,
}: {
  name: string;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
}): Promise<{ dashboards: string[]; queries: StreamQuery[]; rules: string[] }> {
  const [assets, attachments] = await Promise.all([
    queryClient.getAssets(name),
    attachmentClient.getAttachments(name),
  ]);

  const dashboards = attachments
    .filter((attachment) => attachment.type === 'dashboard')
    .map((attachment) => attachment.id);

  const queries = assets
    .filter((asset): asset is Query => asset[ASSET_TYPE] === 'query')
    .map((asset) => asset.query);

  const rules = attachments
    .filter((attachment) => attachment.type === 'rule')
    .map((attachment) => attachment.id);

  return { dashboards, queries, rules };
}

export async function updateWiredIngest({
  streamsClient,
  queryClient,
  attachmentClient,
  name,
  ingest,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
  name: string;
  ingest: WiredIngestUpsertRequest;
}): Promise<UpsertStreamResponse> {
  const { dashboards, queries, rules } = await getStreamAssets({
    name,
    queryClient,
    attachmentClient,
  });

  const definition = await streamsClient.getStream(name);

  if (!Streams.WiredStream.Definition.is(definition)) {
    throw badData(`Can't update wired capabilities of a non-wired stream`);
  }

  const { name: _name, updated_at: _updatedAt, ...stream } = definition;

  const upsertRequest: Streams.WiredStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      ...stream,
      ingest,
    },
    rules,
  };

  return await streamsClient.upsertStream({
    request: upsertRequest,
    name,
  });
}

export async function updateClassicIngest({
  streamsClient,
  queryClient,
  attachmentClient,
  name,
  ingest,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
  name: string;
  ingest: ClassicIngestUpsertRequest;
}): Promise<UpsertStreamResponse> {
  const { dashboards, queries, rules } = await getStreamAssets({
    name,
    queryClient,
    attachmentClient,
  });

  const definition = await streamsClient.getStream(name);

  if (!Streams.ClassicStream.Definition.is(definition)) {
    throw badData(`Can't update classic capabilities of a non-classic stream`);
  }

  const { name: _name, updated_at: _updatedAt, ...stream } = definition;

  const upsertRequest: Streams.ClassicStream.UpsertRequest = {
    dashboards,
    queries,
    stream: {
      ...stream,
      ingest,
    },
    rules,
  };

  return await streamsClient.upsertStream({
    request: upsertRequest,
    name,
  });
}

/**
 * Strips `updated_at` from `processing` to convert from a Definition ingest
 * to an UpsertRequest ingest shape.
 */
const stripProcessingTimestamp = (
  ingest: Streams.ingest.all.Definition['ingest']
): WiredIngestUpsertRequest | ClassicIngestUpsertRequest => {
  const { processing, ...rest } = ingest;
  const { updated_at: _updatedAt, ...processingWithoutTimestamp } = processing;
  return { ...rest, processing: processingWithoutTimestamp } as
    | WiredIngestUpsertRequest
    | ClassicIngestUpsertRequest;
};

export async function patchIngestAndUpsert({
  streamsClient,
  queryClient,
  attachmentClient,
  name,
  patchFn,
}: {
  streamsClient: StreamsClient;
  queryClient: QueryClient;
  attachmentClient: AttachmentClient;
  name: string;
  patchFn: (
    currentIngest: Streams.ingest.all.Definition['ingest']
  ) => Streams.ingest.all.Definition['ingest'];
}): Promise<UpsertStreamResponse> {
  const definition = await streamsClient.getStream(name);

  const isWired = Streams.WiredStream.Definition.is(definition);
  const isClassic = Streams.ClassicStream.Definition.is(definition);

  if (!isWired && !isClassic) {
    throw badData(`Stream "${name}" is not a wired or classic stream`);
  }

  const patchedIngest = patchFn((definition as Streams.ingest.all.Definition).ingest);
  const upsertIngest = stripProcessingTimestamp(patchedIngest);

  if (isWired) {
    return await updateWiredIngest({
      streamsClient,
      queryClient,
      attachmentClient,
      name,
      ingest: upsertIngest as WiredIngestUpsertRequest,
    });
  }

  return await updateClassicIngest({
    streamsClient,
    queryClient,
    attachmentClient,
    name,
    ingest: upsertIngest as ClassicIngestUpsertRequest,
  });
}
