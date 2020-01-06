/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import {
  EMS_FILE,
  MAP_SAVED_OBJECT_TYPE,
  TELEMETRY_TYPE,
} from '../../common/constants';

function getSavedObjectsClient(server) {
  const { SavedObjectsClient, getSavedObjectsRepository } = server.savedObjects;
  const callCluster = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
  const internalRepository = getSavedObjectsRepository(callCluster);
  return new SavedObjectsClient(internalRepository);
}

function getUniqueLayerCounts(layerCountsList, mapsCount) {
  const uniqueLayerTypes = _.uniq(_.flatten(layerCountsList.map(lTypes => Object.keys(lTypes))));

  return uniqueLayerTypes.reduce((accu, type) => {
    const typeCounts = layerCountsList.reduce((accu, tCounts) => {
      tCounts[type] && accu.push(tCounts[type]);
      return accu;
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

export function buildMapsTelemetry(savedObjects) {
  const layerLists = savedObjects.map(savedMapObject =>
    JSON.parse(savedMapObject.attributes.layerListJSON)
  );
  const mapsCount = layerLists.length;

  const dataSourcesCount = layerLists.map(lList => {
    const sourceIdList = lList.map(layer => layer.sourceDescriptor.id);
    return _.uniq(sourceIdList).length;
  });

  const layersCount = layerLists.map(lList => lList.length);
  const layerTypesCount = layerLists.map(lList => _.countBy(lList, 'type'));

  // Count of EMS Vector layers used
  const emsLayersCount = layerLists.map(lList =>
    _(lList)
      .countBy(layer => {
        const isEmsFile = _.get(layer, 'sourceDescriptor.type') === EMS_FILE;
        return isEmsFile && _.get(layer, 'sourceDescriptor.id');
      })
      .pick((val, key) => key !== 'false')
      .value()
  );

  const dataSourcesCountSum = _.sum(dataSourcesCount);
  const layersCountSum = _.sum(layersCount);
  const mapsTelem = {
    // Total count of maps
    mapsTotalCount: mapsCount,
    // Time of capture
    timeCaptured: new Date().toISOString(),
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
  return mapsTelem;
}

async function getSavedObjects(savedObjectsClient) {
  const gisMapsSavedObject = await savedObjectsClient.find({
    type: MAP_SAVED_OBJECT_TYPE,
  });
  return _.get(gisMapsSavedObject, 'saved_objects');
}

export async function getMapsTelemetry(server, callCluster) {
  const savedObjectsClient = getSavedObjectsClient(server, callCluster);
  const savedObjects = await getSavedObjects(savedObjectsClient);
  const mapsTelemetry = buildMapsTelemetry(savedObjects);

  return await savedObjectsClient.create(TELEMETRY_TYPE, mapsTelemetry, {
    id: TELEMETRY_TYPE,
    overwrite: true,
  });
}
