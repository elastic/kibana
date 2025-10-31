/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { htmlIdGenerator, type EuiThemeComputed } from '@elastic/eui';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES } from '@kbn/maps-plugin/common';
import type {
  ESSearchSourceDescriptor,
  VectorStyleDescriptor,
} from '@kbn/maps-plugin/common/descriptor_types';
import type { SerializableRecord } from '@kbn/utility-types';
import { tabColor } from '../../../common/util/group_color_utils';
import type { SourceIndexGeoFields } from '../../application/explorer/explorer_utils';

export function getInitialSourceIndexFieldLayers(
  sourceIndexWithGeoFields: SourceIndexGeoFields,
  euiTheme: EuiThemeComputed
) {
  const initialLayers = [] as unknown as LayerDescriptor[] & SerializableRecord;
  for (const index in sourceIndexWithGeoFields) {
    if (Object.hasOwn(sourceIndexWithGeoFields, index)) {
      const { dataViewId, geoFields } = sourceIndexWithGeoFields[index];

      geoFields.forEach((geoField) => {
        const color = tabColor(geoField, euiTheme);

        initialLayers.push({
          id: htmlIdGenerator()(),
          type: LAYER_TYPE.GEOJSON_VECTOR,
          style: {
            type: 'VECTOR',
            properties: {
              fillColor: {
                type: 'STATIC',
                options: {
                  color,
                },
              },
              lineColor: {
                type: 'STATIC',
                options: {
                  color,
                },
              },
            },
          } as unknown as VectorStyleDescriptor,
          sourceDescriptor: {
            id: htmlIdGenerator()(),
            type: SOURCE_TYPES.ES_SEARCH,
            tooltipProperties: [geoField],
            label: index,
            indexPatternId: dataViewId,
            geoField,
            scalingType: SCALING_TYPES.MVT,
          } as unknown as ESSearchSourceDescriptor,
        });
      });
    }
  }
  return initialLayers;
}
