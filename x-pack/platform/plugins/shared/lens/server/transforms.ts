/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, tfJsonLeaf, tfVariant, tfUnionOverride, tfUnion } from '@kbn/zod';
import { lensApiConfigSchema, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensByRefSerializedAPIConfig } from '@kbn/lens-common-2';
import type { EmbeddableSetup, GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { referencesSchema } from '@kbn/content-management-utils/zod';
import {
  ON_CLICK_VALUE,
  ON_SELECT_RANGE,
  ON_CLICK_ROW,
  ON_APPLY_FILTER,
  ON_OPEN_PANEL_MENU,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { BY_REF_SCHEMA_META, BY_VALUE_SCHEMA_META } from '@kbn/presentation-publishing-schemas';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getTransformIn } from '../common/transforms/transform_in';
import { getTransformOut } from '../common/transforms/transform_out';
import type { LensTransforms } from '../common/transforms/types';
import { isByRefLensConfig, unflattenAPIConfig } from '../common/transforms/utils';
import type { FlattenedLensByValuePanelSchema } from './types';

/**
 * Triggers that Lens visualizations support, derived from visualization definitions:
 * - ON_CLICK_VALUE: VIS_EVENT_TO_TRIGGER.filter (all visualizations)
 * - ON_SELECT_RANGE: VIS_EVENT_TO_TRIGGER.brush (xy, heatmap)
 * - ON_CLICK_ROW: VIS_EVENT_TO_TRIGGER.tableRowContextMenuClick (datatable)
 * - ON_APPLY_FILTER: VIS_EVENT_TO_TRIGGER.applyFilter (all visualizations)
 * - ON_OPEN_PANEL_MENU: VIS_EVENT_TO_TRIGGER.openPanelMenu (all visualizations)
 */
const LENS_SUPPORTED_DRILLDOWN_TRIGGERS = [
  ON_CLICK_VALUE,
  ON_SELECT_RANGE,
  ON_CLICK_ROW,
  ON_APPLY_FILTER,
  ON_OPEN_PANEL_MENU,
];

export function registerLensEmbeddableTransforms(
  embeddableSetup: EmbeddableSetup,
  builder: LensConfigBuilder
) {
  embeddableSetup.registerEmbeddableServerDefinition(LENS_EMBEDDABLE_TYPE, {
    title: 'Visualization',
    getTransforms: (drilldownTransforms) =>
      ({
        transformIn: getTransformIn(builder, drilldownTransforms.transformIn, false),
        transformOut: getTransformOut(builder, drilldownTransforms.transformOut, false),
      } satisfies LensTransforms),
    getSchema: (getDrilldownsSchema) => {
      return getLensPanelSchema(getDrilldownsSchema);
    },
    throwOnUnmappedPanel: (
      config: FlattenedLensByValuePanelSchema | LensByRefSerializedAPIConfig
    ) => {
      if (isByRefLensConfig(config)) return;

      const { attributes } = unflattenAPIConfig(config);
      const chartType = builder.getType(attributes);

      if (builder.isEnabled && !builder.isSupported(chartType)) {
        throw new Error(`Lens "${chartType}" chart type is not supported`);
      }
    },
  });
}

const getSharedPanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  z
    .object({
      references: referencesSchema.optional().meta(tfJsonLeaf()),
      ...serializedTimeRangeSchema.shape,
      ...serializedTitlesSchema.shape,
      ...getDrilldownsSchema(LENS_SUPPORTED_DRILLDOWN_TRIGGERS).shape,
    })
    .strip();

export const getLensByValuePanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  return lensApiConfigSchema.and(getSharedPanelSchema(getDrilldownsSchema)).meta({
    ...BY_VALUE_SCHEMA_META,
    ...tfVariant({ key: 'by_value', match: { absent: 'ref_id' } }),
  });
};

const getLensByRefPanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
  const sharedShape = getSharedPanelSchema(getDrilldownsSchema).shape;
  return z
    .object({
      ref_id: z.string(),
    })
    .extend({
      ...sharedShape,
      // Per-location override. The baseline names by-reference drilldown keys
      // `dashboard` / `discover` / `url`, unlike every other location.
      drilldowns: sharedShape.drilldowns.meta({
        ...tfUnionOverride({
          variant_keys: {
            dashboard_drilldown: 'dashboard',
            discover_drilldown: 'discover',
            url_drilldown: 'url',
          },
        }),
      }),
    })
    .strip()
    .meta({
      ...BY_REF_SCHEMA_META,
      ...tfVariant({ key: 'by_reference', match: { present: 'ref_id' } }),
    });
};

export const getLensPanelSchema = (
  getDrilldownsSchema: GetDrilldownsSchemaFnType
): z.ZodUnion<
  readonly [
    ReturnType<typeof getLensByValuePanelSchema>,
    ReturnType<typeof getLensByRefPanelSchema>
  ]
> =>
  z
    .union([
      getLensByValuePanelSchema(getDrilldownsSchema),
      getLensByRefPanelSchema(getDrilldownsSchema),
    ])
    .meta({
      description: 'Lens embeddable schema',
      ...tfUnion({ structural: true }), // recognizers live on the branches
    });
