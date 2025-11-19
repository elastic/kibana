/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { Streams } from '../models/streams';

export const convertUpsertRequestIntoDefinition = (
  name: string,
  request: Streams.all.UpsertRequest
): Streams.all.Definition => {
  if (Streams.GroupStream.UpsertRequest.is(request)) {
    return {
      ...request.stream,
      name,
      updated_at: new Date().toISOString(),
    } as Streams.GroupStream.Definition;
  }

  if (Streams.ingest.all.UpsertRequest.is(request)) {
    return {
      ...request.stream,
      name,
      updated_at: new Date().toISOString(),
      ingest: {
        ...request.stream.ingest,
        processing: {
          ...request.stream.ingest.processing,
          updated_at: new Date().toISOString(),
        },
      },
    } as Streams.ingest.all.Definition;
  }

  throw new Error(
    "Couldn't parse stream upsert request. Please ensure you're passing a valid request."
  );
};

export const convertGetResponseIntoUpsertRequest = (
  getResponse: Streams.all.GetResponse
): Streams.all.UpsertRequest => {
  if (Streams.GroupStream.GetResponse.is(getResponse)) {
    return {
      dashboards: getResponse.dashboards,
      queries: getResponse.queries,
      rules: getResponse.rules,
      stream: omit(getResponse.stream, ['name', 'updated_at']),
    } as Streams.GroupStream.UpsertRequest;
  }

  if (Streams.ingest.all.GetResponse.is(getResponse)) {
    return {
      dashboards: getResponse.dashboards,
      queries: getResponse.queries,
      rules: getResponse.rules,
      stream: {
        ...omit(getResponse.stream, ['name', 'updated_at']),
        ingest: {
          ...getResponse.stream.ingest,
          processing: omit(getResponse.stream.ingest.processing, ['updated_at']),
        },
      },
    } as Streams.ingest.all.UpsertRequest;
  }

  throw new Error(
    "Couldn't parse stream get request. Please ensure you're passing a valid request."
  );
};
