/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import type { Detection } from '@kbn/significant-events-schema';
import discoveryUserPrompt from './user_prompt.text';

export interface DiscoveryInputParams {
  /** The unhandled detection batch (one latest doc per rule). */
  detections: Array<Partial<Detection>>;
}

/**
 * Build the investigator agent's user message — the same shape the production batch workflow sends.
 * The agent fetches open episodes itself via event_search at the start of each batch.
 */
export function buildDiscoveryInput({ detections }: DiscoveryInputParams): string {
  return Mustache.render(discoveryUserPrompt, {
    activeBatch: JSON.stringify(detections),
  }).trim();
}
