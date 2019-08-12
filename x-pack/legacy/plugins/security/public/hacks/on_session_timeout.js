/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { isSystemApiRequest } from 'ui/system_api';
import { Path } from 'plugins/xpack_main/services/path';
import { npSetup } from 'ui/new_platform';

/**
 * Client session timeout is decreased by this number so that Kibana server
 * can still access session content during logout request to properly clean
 * user session up (invalidate access tokens, redirect to logout portal etc.).
 * @type {number}
 */

const module = uiModules.get('security', []);
module.config(($httpProvider) => {
  $httpProvider.interceptors.push((
    $q,
  ) => {

    const isUnauthenticated = Path.isUnauthenticated();

    function interceptorFactory(responseHandler) {
      return function interceptor(response) {
        if (!isUnauthenticated && !isSystemApiRequest(response.config)) {
          npSetup.plugins.security.sessionTimeout.extend();
        }
        return responseHandler(response);
      };
    }

    return {
      response: interceptorFactory(_.identity),
      responseError: interceptorFactory($q.reject)
    };
  });
});
