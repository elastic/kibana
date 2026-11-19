/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  LensConfigBuilder,
  type LensApiConfig,
  type LensAttributes,
} from '@kbn/lens-embeddable-utils';

/**
 * Shared helpers for turning a stored Lens saved object into the fields of a
 * `visualization` attachment. Both by-reference paths — the attachment type's
 * `resolve()` and the visualization SML type's `toAttachment()` — use these so
 * a given Lens object always resolves to the same `visualization`,
 * `chart_type`, and `esql`.
 */

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));

/** Ensure the Lens attributes carry references before conversion. */
export const withLensReferences = (
  attributes: LensAttributes,
  references: LensAttributes['references'] | undefined
): LensAttributes => ({
  ...attributes,
  references: references ?? attributes.references ?? [],
});

/** Convert stored Lens saved-object attributes into the Lens API config shape. */
export const toLensApiConfig = (attributes: LensAttributes): LensApiConfig =>
  new LensConfigBuilder().toAPIFormat(attributes);

/**
 * Narrow a Lens API config `type` to the shared `SupportedChartType`
 * vocabulary. Returns `undefined` for any type outside the enum so callers omit
 * `chart_type` rather than store a value the tool / dashboard schemas (typed as
 * `SupportedChartType`) would later reject.
 */
export const toSupportedChartType = (apiType: string | undefined): SupportedChartType | undefined =>
  apiType && SUPPORTED_CHART_TYPES.has(apiType) ? (apiType as SupportedChartType) : undefined;

/** Extract the ES|QL query embedded in a text-based Lens visualization, if any. */
export const extractEsqlFromLens = (attributes: LensAttributes): string => {
  try {
    const layers = (attributes.state?.datasourceStates as Record<string, unknown>)?.textBased as
      | { layers?: Record<string, { query?: { esql?: string } }> }
      | undefined;
    if (layers?.layers) {
      const firstLayer = Object.values(layers.layers)[0];
      if (firstLayer?.query?.esql) {
        return firstLayer.query.esql;
      }
    }
    return '';
  } catch {
    return '';
  }
};
