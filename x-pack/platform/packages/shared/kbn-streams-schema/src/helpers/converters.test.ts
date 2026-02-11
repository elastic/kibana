/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Streams } from '../models/streams';
import {
  convertGetResponseIntoUpsertRequest,
  convertUpsertRequestIntoDefinition,
} from './converters';
import { emptyAssets } from './empty_assets';

describe('Converter Helpers', () => {
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
            failure_store: { inherit: {} },
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
            failure_store: { inherit: {} },
          },
        },
      };

      const definition = convertUpsertRequestIntoDefinition('wired-stream', request);

      expect(Streams.WiredStream.Definition.is(definition)).toEqual(true);
    });

    it('converts query streams', () => {
      const request: Streams.QueryStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: '',
          query: {
            view: '$.my-query-stream',
            esql: 'FROM logs | WHERE service.name == "test"',
          },
        },
      };

      const definition = convertUpsertRequestIntoDefinition('my-query-stream', request);

      expect(Streams.QueryStream.Definition.is(definition)).toEqual(true);
      expect((definition as Streams.QueryStream.Definition).query.view).toEqual(
        '$.my-query-stream'
      );
    });
  });

  describe('convertGetResponseIntoUpsertRequest', () => {
    it('converts classic streams', () => {
      const getResponse: Streams.ClassicStream.GetResponse = {
        stream: {
          name: 'classic-stream',
          description: '',
          updated_at: new Date().toISOString(),
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: new Date().toISOString() },
            settings: {},
            classic: {},
            failure_store: { inherit: {} },
          },
        },
        effective_lifecycle: {
          dsl: {},
        },
        effective_settings: {},
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
          view_index_metadata: true,
        },
        effective_failure_store: {
          disabled: {},
        },
        data_stream_exists: true,
        ...emptyAssets,
      };

      const upsertRequest = convertGetResponseIntoUpsertRequest(getResponse);

      expect(Streams.ClassicStream.UpsertRequest.is(upsertRequest)).toEqual(true);
    });

    it('converts wired streams', () => {
      const getResponse: Streams.WiredStream.GetResponse = {
        stream: {
          name: 'wired-stream',
          description: '',
          updated_at: new Date().toISOString(),
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: new Date().toISOString() },
            settings: {},
            wired: {
              fields: {},
              routing: [],
            },
            failure_store: { inherit: {} },
          },
        },
        privileges: {
          lifecycle: true,
          manage: true,
          monitor: true,
          simulate: true,
          text_structure: true,
          read_failure_store: true,
          manage_failure_store: true,
          view_index_metadata: true,
        },
        effective_lifecycle: {
          dsl: {},
          from: 'logs',
        },
        effective_settings: {},
        inherited_fields: {},
        effective_failure_store: {
          disabled: {},
          from: 'logs',
        },
        ...emptyAssets,
      };

      const upsertRequest = convertGetResponseIntoUpsertRequest(getResponse);

      expect(Streams.WiredStream.UpsertRequest.is(upsertRequest)).toEqual(true);
    });

    it('converts query streams', () => {
      const getResponse: Streams.QueryStream.GetResponse = {
        stream: {
          name: 'my-query-stream',
          description: '',
          updated_at: new Date().toISOString(),
          query: {
            view: '$.my-query-stream',
            esql: 'FROM logs | WHERE service.name == "test"',
          },
        },
        inherited_fields: {},
        ...emptyAssets,
      };

      const upsertRequest = convertGetResponseIntoUpsertRequest(getResponse);

      expect(Streams.QueryStream.UpsertRequest.is(upsertRequest)).toEqual(true);
      expect((upsertRequest as Streams.QueryStream.UpsertRequest).stream.query.view).toEqual(
        '$.my-query-stream'
      );
    });
  });
});
