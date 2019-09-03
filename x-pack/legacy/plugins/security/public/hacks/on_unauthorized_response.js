/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { identity } from 'lodash';
import { uiModules } from 'ui/modules';
import { Path } from 'plugins/xpack_main/services/path';
import 'plugins/security/services/auto_logout';

function isUnauthorizedResponseAllowed(response) {
  const API_WHITELIST = [
    '/api/security/v1/login',
    '/api/security/v1/users/.*/password'
  ];

  const url = response.config.url;
  return API_WHITELIST.some(api => url.match(api));
}

const module = uiModules.get('security');
module.factory('onUnauthorizedResponse', ($q, autoLogout) => {
  const isUnauthenticated = Path.isUnauthenticated();
  function interceptorFactory(responseHandler) {
    return function interceptor(response) {
      if (response.status === 401 && !isUnauthorizedResponseAllowed(response) && !isUnauthenticated) return autoLogout();
      return responseHandler(response);
    };
  }

  return {
    response: interceptorFactory(identity),
    responseError: interceptorFactory($q.reject)
  };
});

module.config(($httpProvider) => {
  $httpProvider.interceptors.push('onUnauthorizedResponse');
});
