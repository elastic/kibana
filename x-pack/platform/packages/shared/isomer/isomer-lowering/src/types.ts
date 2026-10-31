/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewMetadata, JsonValue, LensColumn, LensEnvelope } from './schema';

export interface LoweringDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly path: ReadonlyArray<string | number>;
}

export interface ReferencedDataView {
  readonly reference: LensEnvelope['references'][number];
  readonly metadata?: DataViewMetadata;
}

export interface LensQueryPlan {
  readonly layerId: string;
  readonly query: { readonly language: 'esql'; readonly esql: string };
  /** The host applies execution-time context using Lens ES|QL semantics, never string injection. */
  readonly context: {
    readonly ignoreGlobalFilters: boolean;
    readonly timeFieldName?: string;
  };
  /** Lens IDs differ from ES|QL names; several Lens columns may project the same field. */
  readonly columns: readonly LensColumn[];
}

export interface LensLoweringPlan {
  readonly version: 1;
  readonly source: LensEnvelope;
  readonly dataViews: readonly ReferencedDataView[];
  readonly queries: readonly LensQueryPlan[];
}

export type LensLoweringResult =
  | {
      readonly status: 'planned';
      readonly plan: LensLoweringPlan;
      readonly diagnostics: readonly LoweringDiagnostic[];
    }
  | {
      readonly status: 'invalid' | 'unsupported';
      readonly diagnostics: readonly LoweringDiagnostic[];
    };

export interface LensResponseTable {
  readonly layerId: string;
  readonly columns: ReadonlyArray<{
    readonly lens: LensColumn;
    readonly responseType: string;
  }>;
  /** Uncoerced values in Lens column order, including nulls and multivalued cells. */
  readonly rows: ReadonlyArray<readonly JsonValue[]>;
}

export type LensResponseResult =
  | { readonly status: 'ready'; readonly table: LensResponseTable }
  | { readonly status: 'invalid'; readonly diagnostics: readonly LoweringDiagnostic[] };
