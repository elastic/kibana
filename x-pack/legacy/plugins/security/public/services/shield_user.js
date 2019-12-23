/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'angular-resource';
import angular from 'angular';
import { uiModules } from 'ui/modules';

const module = uiModules.get('security', ['ngResource']);
module.service('ShieldUser', ($resource, chrome) => {
  const baseUrl = chrome.addBasePath('/internal/security/users/:username');
  const ShieldUser = $resource(
    baseUrl,
    {
      username: '@username',
    },
    {
      changePassword: {
        method: 'POST',
        url: `${baseUrl}/password`,
        transformRequest: ({ password, newPassword }) => angular.toJson({ password, newPassword }),
      },
      getCurrent: {
        method: 'GET',
        url: chrome.addBasePath('/internal/security/me'),
      },
    }
  );

  return ShieldUser;
});
