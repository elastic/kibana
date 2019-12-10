/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { identity } from 'lodash';
import { uiModules } from 'ui/modules';
import { Path } from 'plugins/xpack_main/services/path';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { xpackInfoSignature } from 'plugins/xpack_main/services/xpack_info_signature';

const module = uiModules.get('xpack_main', []);

module.factory('checkXPackInfoChange', ($q, Private, $injector) => {
  /**
   *  Intercept each network response to look for the kbn-xpack-sig header.
   *  When that header is detected, compare its value with the value cached
   *  in the browser storage. When the value is new, call `xpackInfo.refresh()`
   *  so that it will pull down the latest x-pack info
   *
   *  @param  {object} response - the angular $http response object
   *  @param  {function} handleResponse - callback, expects to receive the response
   *  @return
   */
  function interceptor(response, handleResponse) {
    if (Path.isUnauthenticated()) {
      return handleResponse(response);
    }

    const currentSignature = response.headers('kbn-xpack-sig');
    const cachedSignature = xpackInfoSignature.get();

    if (currentSignature && cachedSignature !== currentSignature) {
      // Signature from the server differ from the signature of our
      // cached info, so we need to refresh it.
      // Intentionally swallowing this error
      // because nothing catches it and it's an ugly console error.
      xpackInfo.refresh($injector).catch(() => {});
    }

    return handleResponse(response);
  }

  return {
    response: (response) => interceptor(response, identity),
    responseError: (response) => interceptor(response, $q.reject)
  };
});

module.config(($httpProvider) => {
  $httpProvider.interceptors.push('checkXPackInfoChange');
});
