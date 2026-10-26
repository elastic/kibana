/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ApplicationSetup,
  AppMountParameters,
  HttpSetup,
  StartServicesAccessor,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { PluginStartDependencies } from '../../plugin';

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const resetSessionApp = Object.freeze({
  id: 'security_reset_session',
  create({ application, http, getStartServices }: CreateDeps) {
    http.anonymousPaths.register('/security/reset_session');
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.resetSessionAppTitle', {
        defaultMessage: 'Access Denied',
      }),
      chromeless: true,
      appRoute: '/security/reset_session',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderResetSessionPage }] = await Promise.all([
          getStartServices(),
          import('./reset_session_page'),
        ]);

        // Get the next URL and logoutUrl from query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const next = urlParams.get('next') || '/';
        const logoutUrl = http.basePath.prepend(
          `/api/security/logout?next=${encodeURIComponent(next)}`
        );

        return renderResetSessionPage(
          coreStart,
          { element },
          {
            logoutUrl,
          }
        );
      },
    });
  },
});
