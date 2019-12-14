/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiModules } from 'ui/modules';
import { isSystemApiRequest } from 'ui/system_api';
import { Path } from 'plugins/xpack_main/services/path';
import { toastNotifications } from 'ui/notify';
import 'plugins/security/services/auto_logout';
import { SessionExpirationWarning } from '../components/session_expiration_warning';

/**
 * Client session timeout is decreased by this number so that Kibana server
 * can still access session content during logout request to properly clean
 * user session up (invalidate access tokens, redirect to logout portal etc.).
 * @type {number}
 */
const SESSION_TIMEOUT_GRACE_PERIOD_MS = 5000;

const module = uiModules.get('security', []);
module.config($httpProvider => {
  $httpProvider.interceptors.push(
    ($timeout, $q, $injector, sessionTimeout, Private, autoLogout) => {
      function refreshSession() {
        // Make a simple request to keep the session alive
        $injector.get('es').ping();
        clearNotifications();
      }

      const isUnauthenticated = Path.isUnauthenticated();
      const notificationLifetime = 60 * 1000;
      const notificationOptions = {
        color: 'warning',
        text: <SessionExpirationWarning onRefreshSession={refreshSession} />,
        title: i18n.translate('xpack.security.hacks.warningTitle', {
          defaultMessage: 'Warning',
        }),
        toastLifeTimeMs: Math.min(
          sessionTimeout - SESSION_TIMEOUT_GRACE_PERIOD_MS,
          notificationLifetime
        ),
      };

      let pendingNotification;
      let activeNotification;
      let pendingSessionExpiration;

      function clearNotifications() {
        if (pendingNotification) $timeout.cancel(pendingNotification);
        if (pendingSessionExpiration) clearTimeout(pendingSessionExpiration);
        if (activeNotification) toastNotifications.remove(activeNotification);
      }

      function scheduleNotification() {
        pendingNotification = $timeout(
          showNotification,
          Math.max(sessionTimeout - notificationLifetime, 0)
        );
      }

      function showNotification() {
        activeNotification = toastNotifications.add(notificationOptions);
        pendingSessionExpiration = setTimeout(
          () => autoLogout(),
          notificationOptions.toastLifeTimeMs
        );
      }

      function interceptorFactory(responseHandler) {
        return function interceptor(response) {
          if (
            !isUnauthenticated &&
            !isSystemApiRequest(response.config) &&
            sessionTimeout !== null
          ) {
            clearNotifications();
            scheduleNotification();
          }
          return responseHandler(response);
        };
      }

      return {
        response: interceptorFactory(_.identity),
        responseError: interceptorFactory($q.reject),
      };
    }
  );
});
