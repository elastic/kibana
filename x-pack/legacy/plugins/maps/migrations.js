/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractReferences } from './common/migrations/references';
import { emsRasterTileToEmsVectorTile } from './common/migrations/ems_raster_tile_to_ems_vector_tile';

export const migrations = {
  'map': {
    '7.2.0': (doc) => {
      const { attributes, references } = extractReferences(doc);

      return {
        ...doc,
        attributes,
        references,
      };
    },
    '7.4.0': (doc) => {
      const attributes = emsRasterTileToEmsVectorTile(doc);

      return {
        ...doc,
        attributes,
      };
    }
  },
};
