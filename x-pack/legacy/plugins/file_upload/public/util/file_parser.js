/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { geoJsonCleanAndValidate } from './geo_json_clean_and_validate';
import { i18n } from '@kbn/i18n';

export async function parseFile(file, previewCallback = null, transformDetails,
  FileReader = window.FileReader) {

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

  // Parse file
  const fr = new FileReader();
  const jsonResult = await new Promise((resolve, reject) => {
    fr.onload = parseAndClean(cleanAndValidate, resolve, reject);
    fr.readAsText(file);
  });
  jsonPreview(jsonResult, previewCallback);

  return jsonResult;
}

export function jsonPreview(json, previewFunction) {
  // Call preview (if any)
  if (json && previewFunction) {
    const defaultName = _.get(json, 'name', 'Import File');
    previewFunction(_.cloneDeep(json), defaultName);
  }
}

export function parseAndClean(cleanAndValidate, resolve, reject) {
  return ({ target: { result } }) => {
    try {
      const parsedJson = JSON.parse(result);
      // Clean & validate
      const cleanAndValidJson = cleanAndValidate(parsedJson);
      if (!cleanAndValidJson) {
        return;
      }
      resolve(cleanAndValidJson);
    } catch (e) {
      reject(e);
    }
  };
}
