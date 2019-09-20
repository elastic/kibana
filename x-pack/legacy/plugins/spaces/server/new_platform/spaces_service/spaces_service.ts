/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { map, take } from 'rxjs/operators';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { Legacy } from 'kibana';
import { Logger, KibanaRequest, CoreSetup } from 'src/core/server';
import { OptionalPlugin } from '../../../../../server/lib/optional_plugin';
import { DEFAULT_SPACE_ID } from '../../../common/constants';
import { SecurityPlugin } from '../../../../security';
import { SpacesClient } from '../../lib/spaces_client';
import { getSpaceIdFromPath, addSpaceIdToPath } from '../../lib/spaces_url_parser';
import { SpacesConfigType } from '../config';
import { namespaceToSpaceId, spaceIdToNamespace } from '../../lib/utils/namespace';
import { LegacyAPI } from '../plugin';

type RequestFacade = KibanaRequest | Legacy.Request;

export interface SpacesServiceSetup {
  scopedClient(request: RequestFacade): Promise<SpacesClient>;

  getSpaceId(request: RequestFacade): string;

  getBasePath(spaceId: string): string;

  isInDefaultSpace(request: RequestFacade): boolean;

  spaceIdToNamespace(spaceId: string): string | undefined;

  namespaceToSpaceId(namespace: string | undefined): string;
}

interface SpacesServiceDeps {
  http: CoreSetup['http'];
  elasticsearch: CoreSetup['elasticsearch'];
  security: OptionalPlugin<SecurityPlugin>;
  config$: Observable<SpacesConfigType>;
  getSpacesAuditLogger(): any;
}

export class SpacesService {
  private configSubscription$?: Subscription;

  constructor(private readonly log: Logger, private readonly getLegacyAPI: () => LegacyAPI) {}

  public async setup({
    http,
    elasticsearch,
    security,
    config$,
    getSpacesAuditLogger,
  }: SpacesServiceDeps): Promise<SpacesServiceSetup> {
    const getSpaceId = (request: RequestFacade) => {
      // Currently utilized by reporting
      const isFakeRequest = typeof (request as any).getBasePath === 'function';

      const basePath = isFakeRequest
        ? (request as Record<string, any>).getBasePath()
        : http.basePath.get(request);

      const spaceId = getSpaceIdFromPath(basePath, this.getServerBasePath());

      return spaceId;
    };

    return {
      getSpaceId,
      getBasePath: (spaceId: string) => {
        if (!spaceId) {
          throw new TypeError(`spaceId is required to retrieve base path`);
        }
        return addSpaceIdToPath(this.getServerBasePath(), spaceId);
      },
      isInDefaultSpace: (request: RequestFacade) => {
        const spaceId = getSpaceId(request);

        return spaceId === DEFAULT_SPACE_ID;
      },
      spaceIdToNamespace,
      namespaceToSpaceId,
      scopedClient: async (request: RequestFacade) => {
        return combineLatest(elasticsearch.adminClient$, config$)
          .pipe(
            map(([clusterClient, config]) => {
              const internalRepository = this.getLegacyAPI().savedObjects.getSavedObjectsRepository(
                clusterClient.callAsInternalUser,
                ['space']
              );

              const callCluster = clusterClient.asScoped(request).callAsCurrentUser;

              const callWithRequestRepository = this.getLegacyAPI().savedObjects.getSavedObjectsRepository(
                callCluster,
                ['space']
              );

              const authorization = security.isEnabled ? security.authorization : null;

              return new SpacesClient(
                getSpacesAuditLogger(),
                (message: string) => {
                  this.log.debug(message);
                },
                authorization,
                callWithRequestRepository,
                config,
                internalRepository,
                request
              );
            }),
            take(1)
          )
          .toPromise();
      },
    };
  }

  public async stop() {
    if (this.configSubscription$) {
      this.configSubscription$.unsubscribe();
      this.configSubscription$ = undefined;
    }
  }

  private getServerBasePath() {
    return this.getLegacyAPI().legacyConfig.serverBasePath;
  }
}
