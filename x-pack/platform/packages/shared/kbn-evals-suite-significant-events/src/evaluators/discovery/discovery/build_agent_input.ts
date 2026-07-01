/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import type { Detection, Discovery } from '@kbn/significant-events-schema';
import discoveryUserPrompt from './user_prompt.text';

export interface DiscoveryInputParams {
  /** Short unique string used verbatim by the agent as the new-episode slug suffix. */
  episodeSuffix: string;
  /** The unhandled detection batch (one latest doc per rule). */
  detections: Array<Partial<Detection>>;
  /** Open discoveries from prior cycles (supporting context for slug continuation). */
  continuationCandidates?: Array<Partial<Discovery>>;
}

/**
 * Build the discovery agent's user message — the same shape the production batch workflow sends.
 * `## Continuation Candidates` is omitted when there are none.
 */
export function buildDiscoveryInput({
  episodeSuffix,
  detections,
  continuationCandidates = [],
}: DiscoveryInputParams): string {
  return Mustache.render(discoveryUserPrompt, {
    episodeSuffix,
    activeBatch: JSON.stringify(detections),
    continuationCandidates: continuationCandidates.length
      ? JSON.stringify(continuationCandidates)
      : null,
  }).trim();
}
