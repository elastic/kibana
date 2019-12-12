/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
// @ts-ignore
import { EMS_FILE, ES_GEO_FIELD_TYPE, MAP_SAVED_OBJECT_TYPE } from '../../common/constants';

export const TELEMETRY_TYPE = 'maps-telemetry';

function getUniqueLayerCounts(layerCountsList: any[], mapsCount: number) {
  const uniqueLayerTypes = _.uniq(_.flatten(layerCountsList.map(lTypes => Object.keys(lTypes))));

  return uniqueLayerTypes.reduce((accu: any, type) => {
    const typeCounts = layerCountsList.reduce((tCountsAccu, tCounts) => {
      if (tCounts[type]) {
        tCountsAccu.push(tCounts[type]);
      }
      return tCountsAccu;
    }, []);
    const typeCountsSum = _.sum(typeCounts);
    accu[type] = {
      min: typeCounts.length ? _.min(typeCounts) : 0,
      max: typeCounts.length ? _.max(typeCounts) : 0,
      avg: typeCountsSum ? typeCountsSum / mapsCount : 0,
    };
    return accu;
  }, {});
}

function getIndexPatternsWithGeoFieldCount(indexPatterns: any[]) {
  const fieldLists = indexPatterns.map(indexPattern => JSON.parse(indexPattern.attributes.fields));
  const fieldListsWithGeoFields = fieldLists.filter(fields =>
    fields.some(
      (field: any) =>
        field.type === ES_GEO_FIELD_TYPE.GEO_POINT || field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE
    )
  );
  return fieldListsWithGeoFields.length;
}

export function buildMapsTelemetry({
  mapSavedObjects,
  indexPatternSavedObjects,
  settings,
}: {
  mapSavedObjects: any[];
  indexPatternSavedObjects: any[];
  settings: any;
}) {
  const layerLists = mapSavedObjects.map(savedMapObject =>
    JSON.parse(savedMapObject.attributes.layerListJSON)
  );
  const mapsCount = layerLists.length;

  const dataSourcesCount = layerLists.map(lList => {
    const sourceIdList = lList.map((layer: any) => layer.sourceDescriptor.id);
    return _.uniq(sourceIdList).length;
  });

  const layersCount = layerLists.map(lList => lList.length);
  const layerTypesCount = layerLists.map(lList => _.countBy(lList, 'type'));

  // Count of EMS Vector layers used
  const emsLayersCount = layerLists.map(lList =>
    _(lList)
      .countBy((layer: any) => {
        const isEmsFile = _.get(layer, 'sourceDescriptor.type') === EMS_FILE;
        return isEmsFile && _.get(layer, 'sourceDescriptor.id');
      })
      .pick((val, key) => key !== 'false')
      .value()
  );

  const dataSourcesCountSum = _.sum(dataSourcesCount);
  const layersCountSum = _.sum(layersCount);

  const indexPatternsWithGeoFieldCount = getIndexPatternsWithGeoFieldCount(
    indexPatternSavedObjects
  );
  return {
    settings,
    indexPatternsWithGeoFieldCount,
    // Total count of maps
    mapsTotalCount: mapsCount,
    // Time of capture
    timeCaptured: new Date(),
    attributesPerMap: {
      // Count of data sources per map
      dataSourcesCount: {
        min: dataSourcesCount.length ? _.min(dataSourcesCount) : 0,
        max: dataSourcesCount.length ? _.max(dataSourcesCount) : 0,
        avg: dataSourcesCountSum ? layersCountSum / mapsCount : 0,
      },
      // Total count of layers per map
      layersCount: {
        min: layersCount.length ? _.min(layersCount) : 0,
        max: layersCount.length ? _.max(layersCount) : 0,
        avg: layersCountSum ? layersCountSum / mapsCount : 0,
      },
      // Count of layers by type
      layerTypesCount: {
        ...getUniqueLayerCounts(layerTypesCount, mapsCount),
      },
      // Count of layer by EMS region
      emsVectorLayersCount: {
        ...getUniqueLayerCounts(emsLayersCount, mapsCount),
      },
    },
  };
}
async function getMapSavedObjects(savedObjectsClient: any) {
  const mapsSavedObjects = await savedObjectsClient.find({ type: MAP_SAVED_OBJECT_TYPE });
  return _.get(mapsSavedObjects, 'saved_objects', []);
}

async function getIndexPatternSavedObjects(savedObjectsClient: any) {
  const indexPatternSavedObjects = await savedObjectsClient.find({ type: 'index-pattern' });
  return _.get(indexPatternSavedObjects, 'saved_objects', []);
}

export async function getMapsTelemetry(savedObjectsClient: any, config: Function) {
  const mapSavedObjects: Array<Record<string, any>> = await getMapSavedObjects(savedObjectsClient);
  const indexPatternSavedObjects: Array<Record<string, any>> = await getIndexPatternSavedObjects(
    savedObjectsClient
  );
  const settings = {
    showMapVisualizationTypes: config().get('xpack.maps.showMapVisualizationTypes'),
  };
  const mapsTelemetry = buildMapsTelemetry({ mapSavedObjects, indexPatternSavedObjects, settings });
  return await savedObjectsClient.create('maps-telemetry', mapsTelemetry, {
    id: TELEMETRY_TYPE,
    overwrite: true,
  });
}
