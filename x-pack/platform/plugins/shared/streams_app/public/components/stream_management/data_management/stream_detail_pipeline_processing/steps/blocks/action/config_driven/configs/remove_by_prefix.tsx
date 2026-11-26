/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RemoveByPrefixProcessorFormState {
  action: 'remove_by_prefix';
  from: string;
  ignore_failure?: boolean;
}

// Intentionally unused in the native ingest-pipeline UI for now. This file is
// kept as a placeholder until ingest pipelines support an equivalent native
// remove-by-prefix processor.
export const removeByPrefixProcessorConfig = undefined;
