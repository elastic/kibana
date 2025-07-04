/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IBasePath, KibanaRequest } from '@kbn/core/server';

import type { Space } from '../../common';
import { getSpaceIdFromPath } from '../../common';
import { DEFAULT_SPACE_ID } from '../../common/constants';
import { namespaceToSpaceId, spaceIdToNamespace } from '../lib/utils/namespace';
import type { ISpacesClient, SpacesClientServiceStart } from '../spaces_client';

/**
 * The Spaces service setup contract.
 */
export interface SpacesServiceSetup {
  /**
   * Retrieves the space id associated with the provided request.
   * @param request the request.
   */
  getSpaceId(request: KibanaRequest): string;

  /**
   * Converts the provided space id into the corresponding Saved Objects `namespace` id.
   * @param spaceId the space id to convert.
   */
  spaceIdToNamespace(spaceId: string): string | undefined;

  /**
   * Converts the provided namespace into the corresponding space id.
   * @param namespace the namespace to convert.
   */
  namespaceToSpaceId(namespace: string | undefined): string;
}

/**
 * The Spaces service start contract.
 */
export interface SpacesServiceStart {
  /**
   * Creates a scoped instance of the SpacesClient.
   * @param request the request.
   */
  createSpacesClient: (request: KibanaRequest) => ISpacesClient;

  /**
   * Retrieves the space id associated with the provided request.
   * @param request the request.
   */
  getSpaceId(request: KibanaRequest): string;

  /**
   * Indicates if the provided request is executing within the context of the `default` space.
   * @param request the request.
   */
  isInDefaultSpace(request: KibanaRequest): boolean;

  /**
   * Retrieves the Space associated with the provided request.
   * @param request the request.
   */
  getActiveSpace(request: KibanaRequest): Promise<Space>;

  /**
   * Converts the provided space id into the corresponding Saved Objects `namespace` id.
   * @param spaceId the space id to convert.
   */
  spaceIdToNamespace(spaceId: string): string | undefined;

  /**
   * Converts the provided namespace into the corresponding space id.
   * @param namespace the namespace to convert.
   */
  namespaceToSpaceId(namespace: string | undefined): string;
}

interface SpacesServiceSetupDeps {
  basePath: IBasePath;
}

interface SpacesServiceStartDeps {
  basePath: IBasePath;
  spacesClientService: SpacesClientServiceStart;
}

/**
 * Service for interacting with spaces.
 */
export class SpacesService {
  public setup({ basePath }: SpacesServiceSetupDeps): SpacesServiceSetup {
    return {
      getSpaceId: (request: KibanaRequest) => {
        return this.getSpaceId(request, basePath);
      },
      spaceIdToNamespace,
      namespaceToSpaceId,
    };
  }

  public start({ basePath, spacesClientService }: SpacesServiceStartDeps): SpacesServiceStart {
    return {
      getSpaceId: (request: KibanaRequest) => {
        return this.getSpaceId(request, basePath);
      },

      getActiveSpace: (request: KibanaRequest) => {
        const spaceId = this.getSpaceId(request, basePath);
        return spacesClientService.createSpacesClient(request).get(spaceId);
      },

      isInDefaultSpace: (request: KibanaRequest) => {
        const spaceId = this.getSpaceId(request, basePath);

        return spaceId === DEFAULT_SPACE_ID;
      },

      createSpacesClient: (request: KibanaRequest) =>
        spacesClientService.createSpacesClient(request),

      spaceIdToNamespace,
      namespaceToSpaceId,
    };
  }

  public stop() {}

  private getSpaceId(request: KibanaRequest, basePathService: IBasePath) {
    const basePath = basePathService.get(request);

    const { spaceId } = getSpaceIdFromPath(basePath, basePathService.serverBasePath);

    return spaceId;
  }
}
