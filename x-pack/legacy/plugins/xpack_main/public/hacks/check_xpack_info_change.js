/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { identity } from 'lodash';
import { EuiCallOut } from '@elastic/eui';
import { uiModules } from 'ui/modules';
import chrome from 'ui/chrome';
import { banners } from 'ui/notify';
import { DebounceProvider } from 'ui/debounce';
import { Path } from 'plugins/xpack_main/services/path';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import { xpackInfoSignature } from 'plugins/xpack_main/services/xpack_info_signature';
import { FormattedMessage } from '@kbn/i18n/react';

const module = uiModules.get('xpack_main', []);

module.factory('checkXPackInfoChange', ($q, Private) => {
  const xpackInfo = Private(XPackInfoProvider);
  const debounce = Private(DebounceProvider);
  const isUnauthenticated = Path.isUnauthenticated();
  let isLicenseExpirationBannerShown = false;

  const notifyIfLicenseIsExpired = debounce(() => {
    const license = xpackInfo.get('license');
    if (license.isActive) {
      return;
    }

    const uploadLicensePath = `${chrome.getBasePath()}/app/kibana#/management/elasticsearch/license_management/upload_license`;

    if (!isLicenseExpirationBannerShown) {
      isLicenseExpirationBannerShown = true;
      banners.add({
        component: (
          <EuiCallOut
            iconType="help"
            color="warning"
            title={<FormattedMessage
              id="xpack.main.welcomeBanner.licenseIsExpiredTitle"
              defaultMessage="Your {licenseType} license is expired"
              values={{ licenseType: license.type }}
            />}
          >
            <FormattedMessage
              id="xpack.main.welcomeBanner.licenseIsExpiredDescription"
              defaultMessage="Contact your administrator or {updateYourLicenseLinkText} directly."
              values={{
                updateYourLicenseLinkText: (
                  <a href={uploadLicensePath}>
                    <FormattedMessage
                      id="xpack.main.welcomeBanner.licenseIsExpiredDescription.updateYourLicenseLinkText"
                      defaultMessage="update your license"
                    />
                  </a>
                )
              }}
            />
          </EuiCallOut>
        ),
      });
    }
  });

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
    if (isUnauthenticated) {
      return handleResponse(response);
    }

    const currentSignature = response.headers('kbn-xpack-sig');
    const cachedSignature = xpackInfoSignature.get();

    if (currentSignature && cachedSignature !== currentSignature) {
      // Signature from the server differ from the signature of our
      // cached info, so we need to refresh it.
      // Intentionally swallowing this error
      // because nothing catches it and it's an ugly console error.
      xpackInfo.refresh().then(
        () => notifyIfLicenseIsExpired(),
        () => {}
      );
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
