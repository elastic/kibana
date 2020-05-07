/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractReferences } from '../../../plugins/maps/common/migrations/references';
import { emsRasterTileToEmsVectorTile } from '../../../plugins/maps/common/migrations/ems_raster_tile_to_ems_vector_tile';
import { topHitsTimeToSort } from '../../../plugins/maps/common/migrations/top_hits_time_to_sort';
import { moveApplyGlobalQueryToSources } from '../../../plugins/maps/common/migrations/move_apply_global_query';
import { addFieldMetaOptions } from '../../../plugins/maps/common/migrations/add_field_meta_options';
import { migrateSymbolStyleDescriptor } from '../../../plugins/maps/common/migrations/migrate_symbol_style_descriptor';
import { migrateUseTopHitsToScalingType } from '../../../plugins/maps/common/migrations/scaling_type';
import { migrateJoinAggKey } from '../../../plugins/maps/common/migrations/join_agg_key';

export const migrations = {
  map: {
    '7.2.0': doc => {
      const { attributes, references } = extractReferences(doc);

      return {
        ...doc,
        attributes,
        references,
      };
    },
    '7.4.0': doc => {
      const attributes = emsRasterTileToEmsVectorTile(doc);

      return {
        ...doc,
        attributes,
      };
    },
    '7.5.0': doc => {
      const attributes = topHitsTimeToSort(doc);

      return {
        ...doc,
        attributes,
      };
    },
    '7.6.0': doc => {
      const attributesPhase1 = moveApplyGlobalQueryToSources(doc);
      const attributesPhase2 = addFieldMetaOptions({ attributes: attributesPhase1 });

      return {
        ...doc,
        attributes: attributesPhase2,
      };
    },
    '7.7.0': doc => {
      const attributesPhase1 = migrateSymbolStyleDescriptor(doc);
      const attributesPhase2 = migrateUseTopHitsToScalingType({ attributes: attributesPhase1 });

      return {
        ...doc,
        attributes: attributesPhase2,
      };
    },
    '7.8.0': doc => {
      const attributes = migrateJoinAggKey(doc);

      return {
        ...doc,
        attributes,
      };
    },
  },
};
