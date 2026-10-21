/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstFormBasedLayer, synthesizeFromFormBased } from './form_based';
import type { SynthesisInput, SynthesisOutput } from './query_types';
import { firstTextBasedLayer, synthesizeFromTextBased } from './text_based';

export const synthesizeQuery = (input: SynthesisInput): SynthesisOutput | undefined => {
  const { state, diagnostics } = input;
  const textBasedLayer = firstTextBasedLayer(state);
  if (textBasedLayer) {
    return synthesizeFromTextBased(textBasedLayer, input);
  }
  const formBasedLayer = firstFormBasedLayer(state, input.preferredLayerId);
  if (formBasedLayer) {
    return synthesizeFromFormBased(formBasedLayer.layer, formBasedLayer.id, input);
  }
  diagnostics.push({
    level: 'error',
    code: 'lens.datasource.unrecognized',
    message: 'Lens panel has no recognized datasource (neither formBased nor textBased)',
  });
  return undefined;
};
