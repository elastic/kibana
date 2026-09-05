/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { ZodType } from '@kbn/zod';
import {
  legacyMetricConfigSchemaNoESQL,
  xyConfigSchemaNoESQL,
  gaugeConfigSchemaNoESQL,
  heatmapConfigSchemaNoESQL,
  tagcloudConfigSchemaNoESQL,
  regionMapConfigSchemaNoESQL,
  metricConfigSchemaNoESQL,
  datatableConfigSchemaNoESQL,
  pieConfigSchemaNoESQL,
  mosaicConfigSchemaNoESQL,
  treemapConfigSchemaNoESQL,
  waffleConfigSchemaNoESQL,
} from '@kbn/lens-embeddable-utils';
import type { LensApiConfigNoESQL } from '@kbn/lens-embeddable-utils';
import { asCodeMetaSchema, getAsCodeTagsSchema } from '@kbn/as-code-shared-schemas';

import { lensCommonSavedObjectSchemaV2 } from '../../../../content_management/zod';

/**
 * Shared properties to extend base configs for saved library items.
 */
const libItemSharedShape = {
  tags: getAsCodeTagsSchema('Tag IDs to associate with this visualization.'),
};

/*
 * Explicitly defined to break TypeScript's serialization limit (TS7056)
 */
export type LensApiConfigLibItemNoESQL = LensApiConfigNoESQL & { tags: string[] };

/**
 * Schema for by reference Lens API config library item, only supports DSL configs.
 */
export const lensApiConfigLibItemSchemaNoESQL: ZodType<LensApiConfigLibItemNoESQL> = z
  .lazy(() =>
    z.union([
      metricConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'metricLibItemNoESQL',
        title: 'Metric Chart (library)',
      }),
      legacyMetricConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'legacyMetricLibItemNoESQL',
        title: 'Legacy Metric Chart (library)',
      }),
      xyConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'xyLibItemNoESQL',
        title: 'XY Chart (library)',
      }),
      gaugeConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'gaugeLibItemNoESQL',
        title: 'Gauge Chart (library)',
      }),
      heatmapConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'heatmapLibItemNoESQL',
        title: 'Heatmap Chart (library)',
      }),
      tagcloudConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'tagcloudLibItemNoESQL',
        title: 'Tag Cloud Chart (library)',
      }),
      regionMapConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'regionMapLibItemNoESQL',
        title: 'Region Map Chart (library)',
      }),
      datatableConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'datatableLibItemNoESQL',
        title: 'Datatable Chart (library)',
      }),
      pieConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'pieLibItemNoESQL',
        title: 'Pie Chart (library)',
      }),
      mosaicConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'mosaicLibItemNoESQL',
        title: 'Mosaic Chart (library)',
      }),
      treemapConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'treemapLibItemNoESQL',
        title: 'Treemap Chart (library)',
      }),
      waffleConfigSchemaNoESQL.extend(libItemSharedShape).meta({
        id: 'waffleLibItemNoESQL',
        title: 'Waffle Chart (library)',
      }),
    ])
  )
  .meta({ id: 'lensApiConfigLibItemNoESQL', title: 'Library Visualization Item' });

/**
 * The Lens response item returned from the server
 */
export const lensResponseItemSchema = z
  .object({
    id: lensCommonSavedObjectSchemaV2.shape.id,
    data: lensApiConfigLibItemSchemaNoESQL,
    meta: asCodeMetaSchema,
  })
  .strict()
  .meta({ id: 'lensResponseItem', title: 'Visualization Response' });
