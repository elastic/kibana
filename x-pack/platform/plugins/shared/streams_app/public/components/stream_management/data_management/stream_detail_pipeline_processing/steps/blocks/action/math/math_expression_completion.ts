/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { monaco } from '@kbn/monaco';
import type { Suggestion } from '../../../../../shared/autocomplete_selector';

// Intentionally unused in the native ingest-pipeline UI for now. Math
// expression completion is kept as a placeholder until an equivalent native
// ingest-pipeline processor exists.
export function registerMathCompletionProvider(
  _fieldSuggestions: Suggestion[] = []
): monaco.IDisposable {
  return { dispose: () => {} };
}
