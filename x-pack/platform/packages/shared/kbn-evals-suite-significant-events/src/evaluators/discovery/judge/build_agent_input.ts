/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Mustache from 'mustache';
import type { Discovery } from '@kbn/significant-events-schema';
import judgeUserPrompt from './user_prompt.text';

export interface DiscoveryJudgeInputParams {
  /** The unreviewed discoveries (and clearances) to assess. */
  discoveries: Array<Partial<Discovery>>;
}

/** Build the discovery judge agent's user message. */
export function buildDiscoveryJudgeInput({ discoveries }: DiscoveryJudgeInputParams): string {
  return Mustache.render(judgeUserPrompt, { discoveries: JSON.stringify(discoveries) }).trim();
}
