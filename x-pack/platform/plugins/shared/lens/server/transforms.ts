/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lensApiStateSchema, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

import { schema } from '@kbn/config-schema';
import type { EmbeddableSetup, GetDrilldownsSchemaFnType } from '@kbn/embeddable-plugin/server';
import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import { referencesSchema } from '@kbn/content-management-utils';
import {
  ON_CLICK_VALUE,
  ON_SELECT_RANGE,
  ON_CLICK_ROW,
  ON_APPLY_FILTER,
  ON_OPEN_PANEL_MENU,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { isByRefLensConfig } from '../common/transforms/utils';
import { lensItemDataSchemaV2 } from './content_management';
import { LENS_EMBEDDABLE_TYPE } from '../common/constants';
import { getTransformIn } from '../common/transforms/transform_in';
import { getTransformOut } from '../common/transforms/transform_out';

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
  embeddableSetup.registerTransforms(LENS_EMBEDDABLE_TYPE, {
    getTransforms: (drilldownTransforms: DrilldownTransforms) => ({
      transformIn: getTransformIn(builder, drilldownTransforms.transformIn),
      transformOut: getTransformOut(builder, drilldownTransforms.transformOut),
    }),
    getSchema: (getDrilldownsSchema: GetDrilldownsSchemaFnType) => {
      return builder.isEnabled ? getLensPanelSchema(getDrilldownsSchema) : undefined;
    },
    throwOnUnmappedPanel: (config: LensSerializedAPIConfig) => {
      if (isByRefLensConfig(config)) return;

      const chartType = builder.getType(config.attributes);

      if (builder.isEnabled && !builder.isSupported(chartType)) {
        throw new Error(`Lens "${chartType}" chart type is not supported`);
      }
    },
  });
}

const legacyPanelAttributesSchema = lensItemDataSchemaV2.extends({
  // Why are these added to the panel attributes?
  // See https://github.com/elastic/kibana/issues/250115
  id: schema.maybe(schema.string()),
  type: schema.maybe(schema.literal('lens')),
});

const getSharedPanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) => ({
  references: schema.maybe(referencesSchema),
  ...serializedTimeRangeSchema.getPropSchemas(),
  ...serializedTitlesSchema.getPropSchemas(),
  ...getDrilldownsSchema(LENS_SUPPORTED_DRILLDOWN_TRIGGERS).getPropSchemas(),
});

const getLensByValuePanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.object({
    attributes: schema.oneOf([lensApiStateSchema, legacyPanelAttributesSchema]),
    ...getSharedPanelSchema(getDrilldownsSchema),
  });

const getLensByRefPanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.object({
    ref_id: schema.string(),
    ...getSharedPanelSchema(getDrilldownsSchema),
  });

const getLensPanelSchema = (getDrilldownsSchema: GetDrilldownsSchemaFnType) =>
  schema.oneOf([
    getLensByValuePanelSchema(getDrilldownsSchema),
    getLensByRefPanelSchema(getDrilldownsSchema),
  ]);
