/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addPanels, controls, edits, grounding, setLayout, whenToUse } from './composition';
import { intentGuidance } from './intent_guidance';
import { prettify } from './prettify';
import { rendering } from './rendering';

export const skillContent = [
  whenToUse,
  grounding,
  addPanels,
  intentGuidance,
  setLayout,
  controls,
  edits,
  prettify,
  rendering,
].join('\n\n');
