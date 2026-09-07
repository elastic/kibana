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
import { parseNextURL } from '@kbn/std';

import type { PluginStartDependencies } from '../../plugin';

interface CreateDeps {
  application: ApplicationSetup;
  http: HttpSetup;
  getStartServices: StartServicesAccessor<PluginStartDependencies>;
}

export const unauthenticatedApp = Object.freeze({
  id: 'security_unauthenticated',
  create({ application, http, getStartServices }: CreateDeps) {
    http.anonymousPaths.register('/security/unauthenticated');
    application.register({
      id: this.id,
      title: i18n.translate('xpack.security.unauthenticatedAppTitle', {
        defaultMessage: 'Authentication Error',
      }),
      chromeless: true,
      appRoute: '/security/unauthenticated',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderUnauthenticatedPage }] = await Promise.all([
          getStartServices(),
          import('./unauthenticated_page'),
        ]);

        // Get the original URL from query parameters
        const loginUrl = parseNextURL(window.location.href, http.basePath.serverBasePath);

        return renderUnauthenticatedPage(
          coreStart,
          { element },
          {
            loginUrl,
          }
        );
      },
    });
  },
});
