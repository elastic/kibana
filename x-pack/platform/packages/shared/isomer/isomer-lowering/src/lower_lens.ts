/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, lazySchema } from '@kbn/zod';
import {
  dataViewMetadataSchema,
  isBoundedJson,
  lensEnvelopeSchema,
  textDatasourceSchema,
} from './schema';
import type { LensLoweringResult, LensQueryPlan, LoweringDiagnostic } from './types';

const inputSchema = lazySchema(() =>
  z
    .object({
      savedObject: lensEnvelopeSchema,
      dataViews: z.array(dataViewMetadataSchema).max(512).default([]),
    })
    .strict()
);

/** Plan a single Lens saved object without executing queries or choosing chart primitives. */
export const lowerLens = (input: unknown): LensLoweringResult => {
  if (!isBoundedJson(input)) {
    return {
      status: 'invalid',
      diagnostics: [
        { code: 'lens.invalid-json', message: 'Expected bounded, finite JSON input', path: [] },
      ],
    };
  }
  const parsed = inputSchema.safeParse(JSON.parse(JSON.stringify(input)));
  if (!parsed.success) {
    return {
      status: 'invalid',
      diagnostics: parsed.error.issues.map(({ message, path }) => ({
        code: 'lens.invalid-input',
        message,
        path: path.map((entry) => (typeof entry === 'symbol' ? String(entry) : entry)),
      })),
    };
  }
  const { savedObject, dataViews } = parsed.data;
  const diagnostics: LoweringDiagnostic[] = [];
  const names = new Set<string>();
  for (const [index, reference] of savedObject.references.entries()) {
    if (names.has(reference.name)) {
      diagnostics.push({
        code: 'lens.duplicate-reference',
        message: `Ambiguous saved-object reference "${reference.name}"`,
        path: ['savedObject', 'references', index],
      });
    }
    names.add(reference.name);
  }
  const metadataIds = new Set<string>();
  for (const [index, metadata] of dataViews.entries()) {
    if (metadataIds.has(metadata.id)) {
      diagnostics.push({
        code: 'lens.duplicate-data-view',
        message: `Ambiguous data-view metadata "${metadata.id}"`,
        path: ['dataViews', index],
      });
    }
    metadataIds.add(metadata.id);
    if (
      !savedObject.references.some(
        (reference) => reference.type === 'index-pattern' && reference.id === metadata.id
      )
    ) {
      diagnostics.push({
        code: 'lens.unreferenced-data-view',
        message: `Data view "${metadata.id}" is not referenced by this Lens`,
        path: ['dataViews', index],
      });
    }
  }
  if (diagnostics.length > 0) {
    return { status: 'invalid', diagnostics };
  }
  const { state } = savedObject.attributes;
  const datasourceIds = Object.keys(state.datasourceStates);
  if (datasourceIds.length !== 1 || datasourceIds[0] !== 'textBased') {
    return {
      status: 'unsupported',
      diagnostics: [
        {
          code: 'lens.unsupported-datasource',
          message:
            'Only native ES|QL Lens layers are supported; form-based and mixed datasources need a dedicated query planner',
          path: ['savedObject', 'attributes', 'state', 'datasourceStates'],
        },
      ],
    };
  }
  const datasource = textDatasourceSchema.safeParse(state.datasourceStates.textBased);
  if (!datasource.success) {
    return {
      status: 'invalid',
      diagnostics: datasource.error.issues.map(({ message, path }) => ({
        code: 'lens.invalid-esql-layer',
        message,
        path: [
          'savedObject',
          'attributes',
          'state',
          'datasourceStates',
          'textBased',
          ...path.map((entry) => (typeof entry === 'symbol' ? String(entry) : entry)),
        ],
      })),
    };
  }
  if (
    (state.filters?.length ?? 0) > 0 ||
    (state.query &&
      (state.query.query !== '' || !['kuery', 'lucene'].includes(String(state.query.language))))
  ) {
    return {
      status: 'unsupported',
      diagnostics: [
        {
          code: 'lens.unsupported-saved-context',
          message:
            'Saved filters and nonempty global queries require Lens execution-context support',
          path: ['savedObject', 'attributes', 'state'],
        },
      ],
    };
  }
  const queries: LensQueryPlan[] = [];
  for (const [layerId, layer] of Object.entries(datasource.data.layers)) {
    const path = [
      'savedObject',
      'attributes',
      'state',
      'datasourceStates',
      'textBased',
      'layers',
      layerId,
    ];
    const columnIds = layer.columns.map(({ columnId }) => columnId);
    if (new Set(columnIds).size !== columnIds.length) {
      diagnostics.push({
        code: 'lens.duplicate-column',
        message: 'Lens column IDs must be unique within a layer',
        path,
      });
    }
    if (
      Object.keys(layer).some(
        (key) => !['query', 'columns', 'timeField', 'index', 'ignoreGlobalFilters'].includes(key)
      ) ||
      layer.columns.some((column) => column.params?.dropPartials === true)
    ) {
      diagnostics.push({
        code: 'lens.unsupported-layer-state',
        message: 'Inline tables, layer extensions and partial-bucket transforms are not supported',
        path,
      });
      continue;
    }
    if (!layer.query) {
      return {
        status: 'invalid',
        diagnostics: [
          {
            code: 'lens.missing-esql-query',
            message: 'Executable layers require an ES|QL query',
            path,
          },
        ],
      };
    }
    queries.push({
      layerId,
      query: { language: 'esql', esql: layer.query.esql },
      context: {
        ignoreGlobalFilters: layer.ignoreGlobalFilters ?? false,
        ...(layer.timeField ? { timeFieldName: layer.timeField } : {}),
      },
      columns: layer.columns,
    });
  }
  if (diagnostics.length > 0) {
    return {
      status: diagnostics.some(({ code }) => code === 'lens.duplicate-column')
        ? 'invalid'
        : 'unsupported',
      diagnostics,
    };
  }
  return {
    status: 'planned',
    plan: {
      version: 1,
      source: savedObject,
      dataViews: savedObject.references
        .filter(({ type }) => type === 'index-pattern')
        .map((reference) => {
          const metadata = dataViews.find(({ id }) => id === reference.id);
          return { reference, ...(metadata ? { metadata } : {}) };
        }),
      queries,
    },
    diagnostics: [],
  };
};
