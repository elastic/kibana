/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IlmPhase } from '../../types';

export interface IndexSummaryTableItem {
  docsCount: number;
  incompatible: number | undefined;
  indexName: string;
  ilmPhase: IlmPhase | undefined;
  pattern: string;
  patternDocsCount: number;
  sizeInBytes: number | undefined;
  checkedAt: number | undefined;
}
