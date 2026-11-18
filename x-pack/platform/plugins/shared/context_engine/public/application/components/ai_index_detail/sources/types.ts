/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexSourceType } from '../../../../../common/http_api/ai_indices';

export type SourceType = AiIndexSourceType;

export interface SelectedSource {
  type: SourceType;
  /** Underlying source value sent to the AI index API (e.g. the ES|QL query or connector id). */
  value: string;
}
