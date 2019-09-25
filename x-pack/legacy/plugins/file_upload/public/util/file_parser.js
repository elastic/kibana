/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';
import { i18n } from '@kbn/i18n';
const oboe = require('oboe');

const FILE_BUFFER = 1024 * 50;

const readSlice = (fileReader, file, start, stop) => {
  const blob = file.slice(start, stop);
  fileReader.readAsBinaryString(blob);
};

const createOboeStreamAndPatterns = cleanAndValidate => {
  const oboeStream = oboe();
  oboeStream.node({
    'features.*': function (feature) {
      const cleanFeature = cleanAndValidate(feature);
      return cleanFeature;
    }
  });
  return oboeStream;
};

let previousFileReader;
const fileHandler = (
  file, chunkHandler, cleanAndValidate, getFileParseActive,
  fileReader = new FileReader(), fileBuffer = FILE_BUFFER
) => {

  if (!file) {
    return Promise.reject(
      new Error(
        i18n.translate('xpack.fileUpload.fileParser.noFileProvided', {
          defaultMessage: 'Error, no file provided',
        })
      )
    );
  }

  const oboeStream = createOboeStreamAndPatterns(cleanAndValidate);

  // Halt any previous file reading activity
  if (previousFileReader) {
    previousFileReader.abort();
  }

  let start;
  let stop = fileBuffer;
  previousFileReader = fileReader;

  const filePromise = new Promise((resolve, reject) => {
    fileReader.onloadend = ({ target: { readyState, result } }) => {
      if (readyState === FileReader.DONE) {
        chunkHandler({
          bytesProcessed: stop || file.size,
          totalBytes: file.size
        });
        if (!getFileParseActive() || !result) {
          oboeStream.abort();
          resolve(null);
          return;
        }
        oboeStream.emit('data', result);
        if (!stop) {
          return;
        }

        start = stop;
        const newStop = stop + fileBuffer;
        // Check EOF
        stop = newStop > file.size ? undefined : newStop;
        readSlice(fileReader, file, start, stop);
      }
    };
    fileReader.onerror = () => {
      fileReader.abort();
      oboeStream.abort();
      reject(new Error(i18n.translate(
        'xpack.fileUpload.fileParser.errorReadingFile', {
          defaultMessage: 'Error reading file',
        })));
    };
    oboeStream.done(parsedGeojson => resolve(parsedGeojson));
  });
  readSlice(fileReader, file, start, stop);
  return filePromise;
};

export function jsonPreview(json, previewFunction) {
  // Call preview (if any)
  if (json && previewFunction) {
    const defaultName = _.get(json, 'name', 'Import File');
    previewFunction(json, defaultName);
  }
}

export async function parseFile(
  file, transformDetails, previewCallback = null, onChunkParse, getFileParseActive
) {
  let cleanAndValidate;
  if (typeof transformDetails === 'object') {
    cleanAndValidate = transformDetails.cleanAndValidate;
  } else {
    switch(transformDetails) {
      case 'geo':
        cleanAndValidate = geoJsonCleanAndValidate;
        break;
      default:
        throw(
          i18n.translate(
            'xpack.fileUpload.fileParser.transformDetailsNotDefined', {
              defaultMessage: 'Index options for {transformDetails} not defined',
              values: { transformDetails }
            })
        );
    }
  }

  const parsedJson = await fileHandler(
    file, onChunkParse, cleanAndValidate, getFileParseActive
  );
  // Stream to both parseFile caller and preview callback
  // const jsonResult = cleanAndValidate(parsedJson);
  jsonPreview(parsedJson, previewCallback);

  return parsedJson;
}
