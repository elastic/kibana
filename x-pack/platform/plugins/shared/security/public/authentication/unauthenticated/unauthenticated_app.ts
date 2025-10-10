/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  ApplicationSetup,
  StartServicesAccessor,
  AppMountParameters,
  HttpSetup,
} from '@kbn/core/public';
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
        defaultMessage: 'Authentication Error' 
      }),
      chromeless: true,
      appRoute: '/security/unauthenticated',
      async mount({ element }: AppMountParameters) {
        const [[coreStart], { renderUnauthenticatedPage }] = await Promise.all([
          getStartServices(),
          import('./unauthenticated_page'),
        ]);
        
        // Get the original URL from query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const originalURL = urlParams.get('next') || '/';
        const loginUrl = http.basePath.prepend(
            `/login?next=${encodeURIComponent(originalURL)}`
        );
        
        return renderUnauthenticatedPage(
          coreStart,
          { element },
          { 
            loginUrl
          }
        );
      },
    });
  },
});
