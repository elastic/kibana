/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CODE_ANALYSIS_FEATURE_TYPE } from '@kbn/streams-schema';
import type { ComputedFeatureGenerator } from './types';

/**
 * Key under which the consuming plugin injects the `code_analysis` provider via
 * {@link ComputedFeatureGeneratorOptions.providers}.
 */
export const CODE_ANALYSIS_PROVIDER_KEY = CODE_ANALYSIS_FEATURE_TYPE;

/**
 * Computed feature that grounds significant-events query generation in the
 * stream's source code.
 *
 * This generator only carries metadata (so its `llmInstructions` flow into the
 * generation prompt). The actual computation — selecting the producing
 * repository by content and verifying log/error strings against the indexed
 * source code — depends on Semantic Code Search (Agent Builder tools) which
 * lives in the consuming plugin, not in this package. The plugin therefore
 * injects a provider via `options.providers[CODE_ANALYSIS_PROVIDER_KEY]`.
 *
 * When no provider is injected (feature disabled, Agent Builder unavailable) or
 * the provider finds no matching repository, `generate` returns `undefined` and
 * the feature is skipped.
 */
export const codeAnalysisGenerator: ComputedFeatureGenerator = {
  type: CODE_ANALYSIS_FEATURE_TYPE,

  description:
    'Log/error message strings, error types, and dependency calls extracted from the source code that produces this stream, verified against values actually present in the logs',

  llmInstructions: `Contains exact log/error message strings, error types, and dependency calls found in the source code that emits this stream, intersected with values actually observed in the logs (so every string is known to occur in both code and data).
Use these strings verbatim when wording detection queries and when choosing \`MATCH_PHRASE\` vs \`:\`. This is your primary source of code-grounded evidence; treat it as a hint that refines queries already anchored in other features, never as a replacement for \`dataset_analysis\`.
The \`properties.evidence\` entries (\`code: <file>:<line> <snippet>\`) can be copied into a query's \`evidence\`.`,

  generate: async (options) => {
    const provider = options.providers?.[CODE_ANALYSIS_PROVIDER_KEY];
    if (!provider) {
      return undefined;
    }
    return provider(options);
  },
};
