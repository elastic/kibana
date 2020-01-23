/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { uiModules } from 'ui/modules';
import { isSystemApiRequest } from 'ui/system_api';
import { npSetup } from 'ui/new_platform';

const module = uiModules.get('security', []);
module.config($httpProvider => {
  $httpProvider.interceptors.push($q => {
    const isAnonymous = npSetup.core.http.anonymousPaths.isAnonymous(window.location.pathname);

    function interceptorFactory(responseHandler) {
      return function interceptor(response) {
        if (!isAnonymous && !isSystemApiRequest(response.config)) {
          npSetup.plugins.security.sessionTimeout.extend(response.config.url);
        }
        return responseHandler(response);
      };
    }

    return {
      response: interceptorFactory(_.identity),
      responseError: interceptorFactory($q.reject),
    };
  });
});
