/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';
import { i18n } from '@kbn/i18n';

export async function readFile(file) {
  const readPromise = new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error(i18n.translate(
        'xpack.fileUpload.fileParser.noFileProvided', {
          defaultMessage: 'Error, no file provided',
        })));
    }
    const fr = new window.FileReader();
    fr.onload = e => resolve(e.target.result);
    fr.onerror = () => {
      fr.abort();
      reject(new Error(i18n.translate(
        'xpack.fileUpload.fileParser.errorReadingFile', {
          defaultMessage: 'Error reading file',
        })));
    };
    fr.readAsText(file);
  });

  return await readPromise;
}

export function jsonPreview(json, previewFunction) {
  // Call preview (if any)
  if (json && previewFunction) {
    const defaultName = _.get(json, 'name', 'Import File');
    previewFunction(json, defaultName);
  }
}

export async function parseFile(file, transformDetails, previewCallback = null) {
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
        return;
    }
  }

  const rawResults = await readFile(file);
  const parsedJson = JSON.parse(rawResults);
  const jsonResult = cleanAndValidate(parsedJson);
  jsonPreview(jsonResult, previewCallback);

  return jsonResult;
}

