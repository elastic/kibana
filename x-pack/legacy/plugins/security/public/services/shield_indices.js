/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';

const module = uiModules.get('security', []);
module.service('shieldIndices', ($http, chrome) => {
  return {
    getFields: query => {
      return $http
        .get(chrome.addBasePath(`/api/security/v1/fields/${query}`))
        .then(response => response.data);
    },
  };
});
