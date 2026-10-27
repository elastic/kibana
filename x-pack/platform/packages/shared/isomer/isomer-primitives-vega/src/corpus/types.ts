/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VegaMode } from '../render';
import type { SpecObject } from '../spec';

/** One spec in the rendering corpus `corpus.test.ts` holds the pack to. */
export interface CorpusSpec {
  name: string;
  mode: VegaMode;
  spec: SpecObject;
  /** Draws from `random()` or a bootstrap, so two renders differ. */
  random?: boolean;
  /** Cannot draw headless; the error it fails with. */
  fails?: RegExp;
}
