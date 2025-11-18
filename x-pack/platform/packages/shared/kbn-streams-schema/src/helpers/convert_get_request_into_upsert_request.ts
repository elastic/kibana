/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { Streams } from '../models/streams';

export const convertGetRequestIntoUpsertRequest = (
  request: Streams.all.GetResponse
): Streams.all.UpsertRequest => {
  if (Streams.GroupStream.GetResponse.is(request)) {
    return {
      dashboards: request.dashboards,
      queries: request.queries,
      rules: request.rules,
      stream: omit(request.stream, ['name', 'updated_at']),
    } as Streams.GroupStream.UpsertRequest;
  }

  if (Streams.ingest.all.GetResponse.is(request)) {
    return {
      dashboards: request.dashboards,
      queries: request.queries,
      rules: request.rules,
      stream: {
        ...omit(request.stream, ['name', 'updated_at']),
        ingest: {
          ...request.stream.ingest,
          processing: omit(request.stream.ingest.processing, ['updated_at']),
        },
      },
    } as Streams.ingest.all.UpsertRequest;
  }

  throw new Error(
    "Couldn't parse stream get request. Please ensure you're passing a valid request."
  );
};
