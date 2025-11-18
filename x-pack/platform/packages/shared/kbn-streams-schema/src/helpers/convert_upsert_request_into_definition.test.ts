/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';
import { convertUpsertRequestIntoDefinition } from './convert_upsert_request_into_definition';
import { emptyAssets } from './empty_assets';

describe('convertUpsertRequestIntoDefinition', () => {
  it('converts classic streams', () => {
    const request: Streams.ClassicStream.UpsertRequest = {
      ...emptyAssets,
      stream: {
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          classic: {},
        },
      },
    };

    const definition = convertUpsertRequestIntoDefinition('classic-stream', request);

    expect(Streams.ClassicStream.Definition.is(definition)).toEqual(true);
  });

  it('converts wired streams', () => {
    const request: Streams.WiredStream.UpsertRequest = {
      ...emptyAssets,
      stream: {
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          wired: { fields: {}, routing: [] },
        },
      },
    };

    const definition = convertUpsertRequestIntoDefinition('wired-stream', request);

    expect(Streams.WiredStream.Definition.is(definition)).toEqual(true);
  });

  it('converts group streams', () => {
    const request: Streams.GroupStream.UpsertRequest = {
      ...emptyAssets,
      stream: {
        description: '',
        group: {
          metadata: {},
          tags: [],
          members: [],
        },
      },
    };

    const definition = convertUpsertRequestIntoDefinition('group-stream', request);

    expect(Streams.GroupStream.Definition.is(definition)).toEqual(true);
  });
});
