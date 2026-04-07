/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type InferenceConnector,
  InferenceConnectorType,
  defaultInferenceEndpoints,
} from '@kbn/inference-common';
import { mergeConnectorsFromApiResponse } from './merge_connectors_from_api_response';

const inferenceConnector = (connectorId: string): InferenceConnector => ({
  type: InferenceConnectorType.Inference,
  name: connectorId,
  connectorId,
  config: {},
  capabilities: {},
  isInferenceEndpoint: true,
  isPreconfigured: false,
});

const DEFAULT_CHAT_ID = defaultInferenceEndpoints.KIBANA_DEFAULT_CHAT_COMPLETION;

describe('mergeConnectorsFromApiResponse', () => {
  describe('when soEntryFound is true (admin SO override)', () => {
    it('returns only the SO-configured connectors', () => {
      const soA = inferenceConnector('so-a');
      const soB = inferenceConnector('so-b');
      const all = [soA, soB, inferenceConnector('other')];

      const result = mergeConnectorsFromApiResponse([soA, soB], all, true);

      expect(result).toEqual([soA, soB]);
    });

    it('returns empty array when SO explicitly lists no endpoints', () => {
      const all = [inferenceConnector('a'), inferenceConnector('b')];

      const result = mergeConnectorsFromApiResponse([], all, true);

      expect(result).toEqual([]);
    });
  });

  describe('when soEntryFound is false and connectors is non-empty (recommended endpoints)', () => {
    it('lists recommended connectors first, then the rest of the catalog without duplicates', () => {
      const recA = inferenceConnector('rec-a');
      const recB = inferenceConnector('rec-b');
      const other = inferenceConnector('other');
      const all = [other, recA, recB, inferenceConnector('tail')];

      const result = mergeConnectorsFromApiResponse([recA, recB], all, false);

      expect(result.map((c) => c.connectorId)).toEqual(['rec-a', 'rec-b', 'other', 'tail']);
    });

    it('preserves server order within the recommended list and within the trailing catalog', () => {
      const first = inferenceConnector('z-first');
      const second = inferenceConnector('a-second');
      const all = [inferenceConnector('c'), inferenceConnector('b')];

      const result = mergeConnectorsFromApiResponse([first, second], all, false);

      expect(result.map((c) => c.connectorId)).toEqual(['z-first', 'a-second', 'c', 'b']);
    });

    it('returns only the recommended list when allConnectors is empty', () => {
      const only = inferenceConnector('solo');

      const result = mergeConnectorsFromApiResponse([only], [], false);

      expect(result).toEqual([only]);
    });
  });

  describe('when soEntryFound is false and connectors is empty (no recommendations)', () => {
    it('moves the platform default chat-completion endpoint to the front', () => {
      const a = inferenceConnector('a');
      const def = inferenceConnector(DEFAULT_CHAT_ID);
      const b = inferenceConnector('b');

      const result = mergeConnectorsFromApiResponse([], [a, b, def], false);

      expect(result[0].connectorId).toBe(DEFAULT_CHAT_ID);
      expect(result.map((c) => c.connectorId)).toEqual([DEFAULT_CHAT_ID, 'a', 'b']);
    });

    it('leaves order unchanged when the default id is already first', () => {
      const def = inferenceConnector(DEFAULT_CHAT_ID);
      const rest = [inferenceConnector('x'), inferenceConnector('y')];

      const result = mergeConnectorsFromApiResponse([], [def, ...rest], false);

      expect(result.map((c) => c.connectorId)).toEqual([DEFAULT_CHAT_ID, 'x', 'y']);
    });

    it('leaves order unchanged when the default id is not in the list', () => {
      const list = [inferenceConnector('x'), inferenceConnector('y')];

      const result = mergeConnectorsFromApiResponse([], list, false);

      expect(result).toEqual(list);
    });

    it('returns allConnectors as-is when list is only the default endpoint', () => {
      const def = inferenceConnector(DEFAULT_CHAT_ID);

      const result = mergeConnectorsFromApiResponse([], [def], false);

      expect(result).toEqual([def]);
    });
  });
});
