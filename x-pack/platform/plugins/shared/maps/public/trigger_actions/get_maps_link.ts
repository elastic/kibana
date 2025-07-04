/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Query } from '@kbn/es-query';
import type { SerializableRecord } from '@kbn/utility-types';
import type { VisualizeFieldContext } from '@kbn/ui-actions-plugin/public';
import { getIndexPatternService, getData, getShareService } from '../kibana_services';
import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES } from '../../common/constants';
import type { LayerDescriptor } from '../../common/descriptor_types';
import type { MapsAppLocator } from '../locators/map_locator/types';
import { MAPS_APP_LOCATOR } from '../locators/map_locator/locator_definition';

export const getMapsLink = async (context: VisualizeFieldContext) => {
  const dataView = await getIndexPatternService().get(context.dataViewSpec.id!);
  // create initial layer descriptor
  const hasTooltips =
    context?.contextualFields?.length && context?.contextualFields[0] !== '_source';
  const initialLayers = [
    {
      id: uuidv4(),
      visible: true,
      type: LAYER_TYPE.MVT_VECTOR,
      sourceDescriptor: {
        id: uuidv4(),
        type: SOURCE_TYPES.ES_SEARCH,
        tooltipProperties: hasTooltips ? context.contextualFields : [],
        label: dataView.getIndexPattern(),
        indexPatternId: context.dataViewSpec.id,
        geoField: context.fieldName,
        scalingType: SCALING_TYPES.MVT,
      },
    },
  ];

  const locator = getShareService().url.locators.get(MAPS_APP_LOCATOR) as MapsAppLocator;
  const location = await locator.getLocation({
    filters: getData().query.filterManager.getFilters(),
    query: getData().query.queryString.getQuery() as Query,
    initialLayers: initialLayers as unknown as LayerDescriptor[] & SerializableRecord,
    timeRange: getData().query.timefilter.timefilter.getTime(),
    dataViewSpec: context.dataViewSpec,
  });

  return location;
};
