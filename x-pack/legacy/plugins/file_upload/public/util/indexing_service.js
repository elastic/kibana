/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { http as httpService } from './http_service';
import { indexPatternService, apiBasePath, savedObjectsClient } from '../kibana_services';
import { getGeoJsonIndexingDetails } from './geo_processing';
import { sizeLimitedChunking } from './size_limited_chunking';
import { i18n } from '@kbn/i18n';

const fileType = 'json';

export async function indexData(parsedFile, transformDetails, indexName, dataType, appName) {
  if (!parsedFile) {
    throw i18n.translate('xpack.fileUpload.indexingService.noFileImported', {
      defaultMessage: 'No file imported.',
    });
  }

  // Perform any processing required on file prior to indexing
  const transformResult = transformDataByFormatForIndexing(transformDetails, parsedFile, dataType);
  if (!transformResult.success) {
    throw i18n.translate('xpack.fileUpload.indexingService.transformResultError', {
      defaultMessage: 'Error transforming data: {error}',
      values: { error: transformResult.error },
    });
  }

  // Create new index
  const { indexingDetails } = transformResult;
  const createdIndex = await writeToIndex({
    appName,
    ...indexingDetails,
    id: undefined,
    data: [],
    index: indexName,
  });
  let id;
  try {
    if (createdIndex && createdIndex.id) {
      id = createdIndex.id;
    } else {
      throw i18n.translate('xpack.fileUpload.indexingService.errorCreatingIndex', {
        defaultMessage: 'Error creating index',
      });
    }
  } catch (error) {
    return {
      error,
      success: false,
    };
  }

  // Write to index
  const indexWriteResults = await chunkDataAndWriteToIndex({
    id,
    index: indexName,
    ...indexingDetails,
    settings: {},
    mappings: {},
  });
  return indexWriteResults;
}

function transformDataByFormatForIndexing(transform, parsedFile, dataType) {
  let indexingDetails;
  if (!transform) {
    return {
      success: false,
      error: i18n.translate('xpack.fileUpload.indexingService.noTransformDefined', {
        defaultMessage: 'No transform defined',
      }),
    };
  }
  if (typeof transform !== 'object') {
    switch (transform) {
      case 'geo':
        indexingDetails = getGeoJsonIndexingDetails(parsedFile, dataType);
        break;
      default:
        return {
          success: false,
          error: i18n.translate('xpack.fileUpload.indexingService.noHandlingForTransform', {
            defaultMessage: 'No handling defined for transform: {transform}',
            values: { transform },
          }),
        };
    }
  } else {
    // Custom transform
    indexingDetails = transform.getIndexingDetails(parsedFile);
  }
  if (indexingDetails && indexingDetails.data && indexingDetails.data.length) {
    return {
      success: true,
      indexingDetails,
    };
  } else if (indexingDetails && indexingDetails.data) {
    return {
      success: false,
      error: i18n.translate('xpack.fileUpload.indexingService.noIndexingDetailsForDatatype', {
        defaultMessage: `No indexing details defined for datatype: {dataType}`,
        values: { dataType },
      }),
    };
  } else {
    return {
      success: false,
      error: i18n.translate('xpack.fileUpload.indexingService.unknownTransformError', {
        defaultMessage: 'Unknown error performing transform: {transform}',
        values: { transform },
      }),
    };
  }
}

async function writeToIndex(indexingDetails) {
  const paramString = indexingDetails.id !== undefined ? `?id=${indexingDetails.id}` : '';
  const { appName, index, data, settings, mappings, ingestPipeline } = indexingDetails;

  return await httpService({
    url: `${apiBasePath}/fileupload/import${paramString}`,
    method: 'POST',
    data: {
      index,
      data,
      settings,
      mappings,
      ingestPipeline,
      fileType,
      ...(appName ? { app: appName } : {}),
    },
  });
}

async function chunkDataAndWriteToIndex({ id, index, data, mappings, settings }) {
  if (!index) {
    return {
      success: false,
      error: i18n.translate('xpack.fileUpload.noIndexSuppliedErrorMessage', {
        defaultMessage: 'No index provided.',
      }),
    };
  }

  const chunks = sizeLimitedChunking(data);

  let success = true;
  let failures = [];
  let error;
  let docCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const aggs = {
      id,
      index,
      data: chunks[i],
      settings,
      mappings,
      ingestPipeline: {}, // TODO: Support custom ingest pipelines
    };

    let resp = {
      success: false,
      failures: [],
      docCount: 0,
    };
    resp = await writeToIndex(aggs);

    failures = [...failures, ...resp.failures];
    if (resp.success) {
      ({ success } = resp);
      docCount = docCount + resp.docCount;
    } else {
      success = false;
      error = resp.error;
      docCount = 0;
      break;
    }
  }

  return {
    success,
    failures,
    docCount,
    ...(error ? { error } : {}),
  };
}

export async function createIndexPattern(indexPatternName) {
  const indexPatterns = await indexPatternService.get();
  try {
    Object.assign(indexPatterns, {
      id: '',
      title: indexPatternName,
    });

    await indexPatterns.create(true);
    const id = await getIndexPatternId(indexPatternName);
    const indexPattern = await indexPatternService.get(id);
    return {
      success: true,
      id,
      fields: indexPattern.fields,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}

async function getIndexPatternId(name) {
  const savedObjectSearch = await savedObjectsClient.find({ type: 'index-pattern', perPage: 1000 });
  const indexPatternSavedObjects = savedObjectSearch.savedObjects;

  if (indexPatternSavedObjects) {
    const ip = indexPatternSavedObjects.find(i => i.attributes.title === name);
    return ip !== undefined ? ip.id : undefined;
  } else {
    return undefined;
  }
}

export const getExistingIndexNames = async () => {
  const indexes = await httpService({
    url: `${apiBasePath}/index_management/indices`,
    method: 'GET',
  });
  return indexes ? indexes.map(({ name }) => name) : [];
};

export const getExistingIndexPatternNames = async () => {
  const indexPatterns = await savedObjectsClient
    .find({
      type: 'index-pattern',
      fields: ['id', 'title', 'type', 'fields'],
      perPage: 10000,
    })
    .then(({ savedObjects }) => savedObjects.map(savedObject => savedObject.get('title')));
  return indexPatterns ? indexPatterns.map(({ name }) => name) : [];
};

export function checkIndexPatternValid(name) {
  const byteLength = encodeURI(name).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1;
  const reg = new RegExp('[\\\\/*?"<>|\\s,#]+');
  const indexPatternInvalid =
    byteLength > 255 || // name can't be greater than 255 bytes
    name !== name.toLowerCase() || // name should be lowercase
    name === '.' ||
    name === '..' || // name can't be . or ..
    name.match(/^[-_+]/) !== null || // name can't start with these chars
    name.match(reg) !== null; // name can't contain these chars
  return !indexPatternInvalid;
}
