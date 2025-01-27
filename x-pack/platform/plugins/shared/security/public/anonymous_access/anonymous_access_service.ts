/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Capabilities, HttpStart } from '@kbn/core/public';
import type {
  AnonymousAccessServiceContract,
  AnonymousAccessState,
} from '@kbn/share-plugin/common';
import type { SharePluginSetup } from '@kbn/share-plugin/public';

const DEFAULT_ANONYMOUS_ACCESS_STATE = Object.freeze<AnonymousAccessState>({
  isEnabled: false,
  accessURLParameters: null,
});

interface SetupDeps {
  share: Pick<SharePluginSetup, 'setAnonymousAccessServiceProvider'>;
}

interface StartDeps {
  http: HttpStart;
}

/**
 * Service that allows to retrieve application state.
 */
export class AnonymousAccessService {
  private internalService!: AnonymousAccessServiceContract;

  setup({ share }: SetupDeps) {
    share.setAnonymousAccessServiceProvider(() => this.internalService);
  }

  start({ http }: StartDeps) {
    this.internalService = {
      getCapabilities: () =>
        http.get<Capabilities>('/internal/security/anonymous_access/capabilities'),
      getState: () =>
        http.anonymousPaths.isAnonymous(window.location.pathname)
          ? Promise.resolve(DEFAULT_ANONYMOUS_ACCESS_STATE)
          : http
              .get<AnonymousAccessState>('/internal/security/anonymous_access/state')
              .catch(() => DEFAULT_ANONYMOUS_ACCESS_STATE),
    };
  }
}
