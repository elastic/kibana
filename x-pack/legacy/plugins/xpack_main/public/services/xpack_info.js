/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get as lodashGet } from 'lodash';
import chrome from 'ui/chrome';
import { xpackInfoSignature } from './xpack_info_signature';
import { convertKeysToCamelCaseDeep } from '../../../../server/lib/key_case_converter';

const XPACK_INFO_KEY = 'xpackMain.info';

let inProgressRefreshPromise = null;

const setAll = (updatedXPackInfo) => {
  // The decision to convert kebab-case/snake-case keys to camel-case keys stemmed from an old
  // convention of using kebabe-case/snake-case in API response bodies but camel-case in JS
  // objects. See pull #29304 for more info.
  const camelCasedXPackInfo = convertKeysToCamelCaseDeep(updatedXPackInfo);
  sessionStorage.setItem(XPACK_INFO_KEY, JSON.stringify(camelCasedXPackInfo));
};

const get = (path, defaultValue = undefined) => {
  const xpackInfoValuesJson = sessionStorage.getItem(XPACK_INFO_KEY);
  const xpackInfoValues = xpackInfoValuesJson ? JSON.parse(xpackInfoValuesJson) : {};
  return lodashGet(xpackInfoValues, path, defaultValue);
};

export function xpackInfoService($injector) {
  setAll(chrome.getInjected('xpackInitialInfo') || {});
  return {
    get,
    setAll,

    clear: () => {
      sessionStorage.removeItem(XPACK_INFO_KEY);
    },

    refresh: () => {
      if (inProgressRefreshPromise) {
        return inProgressRefreshPromise;
      }

      // store the promise in a shared location so that calls to
      // refresh() before this is complete will get the same promise
      const $http = $injector.get('$http'); // $http must be consumed here - if passed in, circular dependency errors
      inProgressRefreshPromise = (
        $http.get(chrome.addBasePath('/api/xpack/v1/info'))
          .catch((err) => {
          // if we are unable to fetch the updated info, we should
          // prevent reusing stale info
            this.clear();
            xpackInfoSignature.clear();
            throw err;
          })
          .then((xpackInfoResponse) => {
            this.setAll(xpackInfoResponse.data);
            xpackInfoSignature.set(xpackInfoResponse.headers('kbn-xpack-sig'));
          })
          .finally(() => {
            inProgressRefreshPromise = null;
          })
      );
      return inProgressRefreshPromise;
    },

    getLicense: () => {
      return get('license', {
        isActive: false,
        type: undefined,
        expiryDateInMillis: undefined,
      });
    }
  };
}

