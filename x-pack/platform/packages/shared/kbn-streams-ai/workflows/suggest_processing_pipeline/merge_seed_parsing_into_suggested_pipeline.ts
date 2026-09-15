/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  addDeterministicCustomIdentifiers,
  stripCustomIdentifiers,
  type DissectProcessor,
  type GrokProcessor,
  type StreamlangDSL,
} from '@kbn/streamlang';

/**
 * Prepends a server-selected grok/dissect processor to the agent's suggested pipeline and
 * re-assigns step identifiers. Use at the orchestration layer only — `suggestProcessingPipeline`
 * does not receive the seed parser.
 */
export function mergeSeedParsingProcessorIntoSuggestedPipeline(
  seedParsingProcessor: GrokProcessor | DissectProcessor,
  agentSuggestedPipeline: StreamlangDSL
): StreamlangDSL {
  const strippedAgent = stripCustomIdentifiers(agentSuggestedPipeline);
  const seedStep = stripCustomIdentifiers({
    steps: [seedParsingProcessor as StreamlangDSL['steps'][number]],
  }).steps[0];

  return addDeterministicCustomIdentifiers({
    steps: [seedStep, ...strippedAgent.steps],
  });
}
