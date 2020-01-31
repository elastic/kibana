/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'angular-resource';
import { omit } from 'lodash';
import angular from 'angular';
import { uiModules } from 'ui/modules';

const module = uiModules.get('security', ['ngResource']);
module.service('ShieldRole', ($resource, chrome) => {
  return $resource(
    chrome.addBasePath('/api/security/role/:name'),
    {
      name: '@name',
    },
    {
      save: {
        method: 'PUT',
        transformRequest(data) {
          return angular.toJson(
            omit(data, 'name', 'transient_metadata', '_unrecognized_applications')
          );
        },
      },
    }
  );
});
