/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Action verb describing what happened to a stream-owned asset (a Feature
 * row, a Query asset, ...). The SML side maps `'upsert'` to
 * `'create'` / `'update'` because both result in the same chunk-rebuild
 * behaviour; consumers never have to model the difference.
 */
export type StreamAssetAction = 'upsert' | 'delete';

/**
 * Generic "asset write happened" callback used by FeatureClient / QueryClient.
 *
 * The clients sit in `lib/streams/`, so this interface deliberately knows
 * nothing about KIs, the SML, or `agent_builder`. Adapters in
 * `agent_builder/sml/` are responsible for turning these notifications into
 * the KI-specific SML index actions and for tagging each call with the right
 * KI kind. Calls are fire-and-forget: implementations must never throw and
 * must not block the underlying storage write.
 */
export interface StreamAssetIndexer {
  notify: (action: StreamAssetAction, id: string) => void;
}
