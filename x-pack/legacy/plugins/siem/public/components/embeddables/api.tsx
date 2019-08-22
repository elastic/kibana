/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { useKibanaUiSetting } from '../../lib/settings/use_kibana_ui_setting';
import { DEFAULT_KBN_VERSION } from '../../../common/constants';
import { MAP_SAVED_OBJECT } from './saved_objects/saved_objects';
import { ImportSavedObjectResponse } from './types';

/**
 * Imports Kibana Saved Object from ndjson file
 *
 */
export const importSavedObject = async (): Promise<string> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  const formData = new FormData();
  formData.append(
    'file',
    new File([new Blob([JSON.stringify(MAP_SAVED_OBJECT)])], 'pewpew_no_objects.ndjson')
    // new File(
    //   [new Blob([JSON.stringify(getMapSavedObject('filebeat-map-index-id'))])],
    //   'pewpew_no_objects.ndjson'
    // )
  );

  const response = await fetch(
    `${chrome.getBasePath()}/api/saved_objects/_import?overwrite=false`,
    {
      method: 'POST',
      credentials: 'same-origin',
      // content-type intentionally missing as client will add `multipart/form-data` w/ correct boundary as this is FormData
      headers: {
        'kbn-system-api': 'true',
        'kbn-version': kbnVersion,
        'kbn-xsrf': kbnVersion,
      },
      body: formData,
    }
  );
  // await throwIfNotOk(response);
  const results: ImportSavedObjectResponse = await response.json();

  console.log('Import response', results);

  return JSON.stringify(results, null, 2);
};

/**
 * Returns whether or not a saved object exists for the given type/id
 */
export const savedObjectExists = async (type: string, id: string): Promise<boolean> => {
  const [kbnVersion] = useKibanaUiSetting(DEFAULT_KBN_VERSION);

  const response = await fetch(`${chrome.getBasePath()}/api/saved_objects/${type}/${id}`, {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      'kbn-system-api': 'true',
      'kbn-version': kbnVersion,
      'kbn-xsrf': kbnVersion,
    },
  });

  return response.ok;
};
