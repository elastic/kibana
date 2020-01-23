/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';
import { i18n } from '@kbn/i18n';
import { PatternReader } from './pattern_reader';

// In local testing, performance improvements leveled off around this size
export const FILE_BUFFER = 1024000;

const readSlice = (fileReader, file, start, stop) => {
  const blob = file.slice(start, stop);
  fileReader.readAsBinaryString(blob);
};

let prevFileReader;
let prevPatternReader;
export const fileHandler = async ({
  file,
  setFileProgress,
  cleanAndValidate,
  getFileParseActive,
  fileReader = new FileReader(),
}) => {
  if (!file) {
    return Promise.reject(
      new Error(
        i18n.translate('xpack.fileUpload.fileParser.noFileProvided', {
          defaultMessage: 'Error, no file provided',
        })
      )
    );
  }

  // Halt any previous file reading & pattern checking activity
  if (prevFileReader) {
    prevFileReader.abort();
  }
  if (prevPatternReader) {
    prevPatternReader.abortStream();
  }

  // Set up feature tracking
  let featuresProcessed = 0;
  const onFeatureRead = feature => {
    // TODO: Add handling and tracking for cleanAndValidate fails
    featuresProcessed++;
    return cleanAndValidate(feature);
  };

  let start;
  let stop = FILE_BUFFER;

  prevFileReader = fileReader;

  const filePromise = new Promise((resolve, reject) => {
    const onStreamComplete = fileResults => {
      if (!featuresProcessed) {
        reject(
          new Error(
            i18n.translate('xpack.fileUpload.fileParser.noFeaturesDetected', {
              defaultMessage: 'Error, no features detected',
            })
          )
        );
      } else {
        resolve(fileResults);
      }
    };
    const patternReader = new PatternReader({ onFeatureDetect: onFeatureRead, onStreamComplete });
    prevPatternReader = patternReader;

    fileReader.onloadend = ({ target: { readyState, result } }) => {
      if (readyState === FileReader.DONE) {
        if (!getFileParseActive() || !result) {
          fileReader.abort();
          patternReader.abortStream();
          resolve(null);
          return;
        }
        setFileProgress({
          featuresProcessed,
          bytesProcessed: stop || file.size,
          totalBytes: file.size,
        });
        patternReader.writeDataToPatternStream(result);
        if (!stop) {
          return;
        }

        start = stop;
        const newStop = stop + FILE_BUFFER;
        // Check EOF
        stop = newStop > file.size ? undefined : newStop;
        readSlice(fileReader, file, start, stop);
      }
    };
    fileReader.onerror = () => {
      fileReader.abort();
      patternReader.abortStream();
      reject(
        new Error(
          i18n.translate('xpack.fileUpload.fileParser.errorReadingFile', {
            defaultMessage: 'Error reading file',
          })
        )
      );
    };
  });
  readSlice(fileReader, file, start, stop);
  return filePromise;
};

export function jsonPreview(fileResults, previewFunction) {
  if (fileResults && fileResults.parsedGeojson && previewFunction) {
    const defaultName = _.get(fileResults.parsedGeojson, 'name', 'Import File');
    previewFunction(fileResults.parsedGeojson, defaultName);
  }
}

export async function parseFile({
  file,
  transformDetails,
  onFileUpload: previewCallback = null,
  setFileProgress,
  getFileParseActive,
}) {
  let cleanAndValidate;
  if (typeof transformDetails === 'object') {
    cleanAndValidate = transformDetails.cleanAndValidate;
  } else {
    switch (transformDetails) {
      case 'geo':
        cleanAndValidate = geoJsonCleanAndValidate;
        break;
      default:
        throw i18n.translate('xpack.fileUpload.fileParser.transformDetailsNotDefined', {
          defaultMessage: 'Index options for {transformDetails} not defined',
          values: { transformDetails },
        });
    }
  }

  const fileResults = await fileHandler({
    file,
    setFileProgress,
    cleanAndValidate,
    getFileParseActive,
  });
  jsonPreview(fileResults, previewCallback);
  return fileResults;
}
