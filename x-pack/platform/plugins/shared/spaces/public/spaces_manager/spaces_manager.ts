/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { BehaviorSubject, skipWhile } from 'rxjs';

import type { HttpSetup } from '@kbn/core/public';
import type { SavedObjectsCollectMultiNamespaceReferencesResponse } from '@kbn/core-saved-objects-api-server';
import type { LegacyUrlAliasTarget } from '@kbn/core-saved-objects-common';
import type { Logger } from '@kbn/logging';
import type { Role } from '@kbn/security-plugin-types-common';

import {
  API_VERSIONS,
  type GetAllSpacesOptions,
  type GetSpaceResult,
  type Space,
} from '../../common';
import type { CopySavedObjectsToSpaceResponse } from '../copy_saved_objects_to_space/types';
import type { SpaceContentTypeSummaryItem } from '../types';

interface SavedObjectTarget {
  type: string;
  id: string;
}

interface HttpErrorLike {
  body?: { statusCode?: number };
  response?: { status?: number };
}

const TAG_TYPE = 'tag';
const version = API_VERSIONS.public.v1;
const ACTIVE_SPACE_RETRY_DELAYS_MS = [500, 1_500, 4_000];

const getErrorStatus = (error: unknown) => {
  const { body, response } = (error ?? {}) as HttpErrorLike;
  return body?.statusCode ?? response?.status;
};

const isRetryableStatus = (status: number | undefined) =>
  // An absent status means the request never reached the server; the rest are transient server-side conditions.
  status === undefined || status === 408 || status === 429 || status >= 500;

export class SpacesManager {
  private activeSpace$: BehaviorSubject<Space | null> = new BehaviorSubject<Space | null>(null);

  // The in-flight active-space request, shared by every caller that arrives while it is pending.
  private activeSpaceRequest?: Promise<void>;

  private readonly serverBasePath: string;

  private readonly _onActiveSpaceChange$: Observable<Space>;

  constructor(private readonly http: HttpSetup, private readonly logger: Logger) {
    this.serverBasePath = http.basePath.serverBasePath;

    this._onActiveSpaceChange$ = this.activeSpace$
      .asObservable()
      .pipe(skipWhile((v: Space | null) => v == null)) as Observable<Space>;
  }

  public get onActiveSpaceChange$() {
    if (!this.activeSpace$.value) {
      // Nothing awaits this: subscribers only ever observe successful emissions, and
      // `fetchActiveSpace()` has already logged the failure.
      this.refreshActiveSpace().catch(() => {});
    }
    return this._onActiveSpaceChange$;
  }

  public async getSpaces(options: GetAllSpacesOptions = {}): Promise<GetSpaceResult[]> {
    const { purpose, includeAuthorizedPurposes } = options;
    const query = { purpose, include_authorized_purposes: includeAuthorizedPurposes };
    return await this.http.get('/api/spaces/space', { query, version });
  }

  public async getSpace(id: string): Promise<Space> {
    return await this.http.get(`/api/spaces/space/${encodeURIComponent(id)}`, { version });
  }

  public async getActiveSpace({ forceRefresh = false } = {}) {
    if (this.isAnonymousPath()) {
      throw new Error(`Cannot retrieve the active space for anonymous paths`);
    }
    if (forceRefresh || !this.activeSpace$.value) {
      await this.refreshActiveSpace({ fresh: forceRefresh });
    }
    return this.activeSpace$.value!;
  }

  public async createSpace(space: Space) {
    await this.http.post(`/api/spaces/space`, {
      body: JSON.stringify(space),
      version,
    });
  }

  public async updateSpace(space: Space) {
    await this.http.put(`/api/spaces/space/${encodeURIComponent(space.id)}`, {
      query: {
        overwrite: true,
      },
      body: JSON.stringify(space),
      version,
    });

    const activeSpaceId = (await this.getActiveSpace()).id;

    if (space.id === activeSpaceId) {
      // A request that started before the update could return the old space, so start a new one.
      // Nothing awaits this, and `fetchActiveSpace()` has already logged any failure.
      this.refreshActiveSpace({ fresh: true }).catch(() => {});
    }
  }

  public async deleteSpace(space: Space) {
    await this.http.delete(`/api/spaces/space/${encodeURIComponent(space.id)}`, { version });
  }

  public async disableLegacyUrlAliases(aliases: LegacyUrlAliasTarget[]) {
    await this.http.post('/api/spaces/_disable_legacy_url_aliases', {
      body: JSON.stringify({ aliases }),
    });
  }

  public async copySavedObjects(
    objects: SavedObjectTarget[],
    spaces: string[],
    includeReferences: boolean,
    createNewCopies: boolean,
    overwrite: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return this.http.post('/api/spaces/_copy_saved_objects', {
      body: JSON.stringify({
        objects,
        spaces,
        includeReferences,
        createNewCopies,
        ...(createNewCopies ? { overwrite: false } : { overwrite }), // ignore the overwrite option if createNewCopies is enabled
      }),
    });
  }

  public async resolveCopySavedObjectsErrors(
    objects: SavedObjectTarget[],
    retries: unknown,
    includeReferences: boolean,
    createNewCopies: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return this.http.post(`/api/spaces/_resolve_copy_saved_objects_errors`, {
      body: JSON.stringify({
        objects,
        includeReferences,
        createNewCopies,
        retries,
      }),
    });
  }

  public async getShareSavedObjectPermissions(
    type: string
  ): Promise<{ shareToAllSpaces: boolean }> {
    return this.http
      .get<{ shareToAllSpaces: boolean }>('/internal/security/_share_saved_object_permissions', {
        query: { type },
      })
      .catch((err) => {
        const isNotFound = err?.body?.statusCode === 404;
        if (isNotFound) {
          // security is not enabled
          return { shareToAllSpaces: true };
        }
        throw err;
      });
  }

  public async getShareableReferences(
    objects: SavedObjectTarget[]
  ): Promise<SavedObjectsCollectMultiNamespaceReferencesResponse> {
    const response = await this.http.post<SavedObjectsCollectMultiNamespaceReferencesResponse>(
      `/api/spaces/_get_shareable_references`,
      { body: JSON.stringify({ objects }) }
    );

    // We should exclude any child-reference tags because we don't yet support reconciling/merging duplicate tags. In other words: tags can
    // be shared directly, but if a tag is only included as a reference of a requested object, it should not be shared.
    const requestedObjectsSet = objects.reduce(
      (acc, { type, id }) => acc.add(`${type}:${id}`),
      new Set<string>()
    );
    const filteredObjects = response.objects.filter(
      ({ type, id }) => type !== TAG_TYPE || requestedObjectsSet.has(`${type}:${id}`)
    );
    return { objects: filteredObjects };
  }

  public async updateSavedObjectsSpaces(
    objects: SavedObjectTarget[],
    spacesToAdd: string[],
    spacesToRemove: string[]
  ): Promise<void> {
    return this.http.post(`/api/spaces/_update_objects_spaces`, {
      body: JSON.stringify({ objects, spacesToAdd, spacesToRemove }),
    });
  }

  public redirectToSpaceSelector() {
    window.location.href = `${this.serverBasePath}/spaces/space_selector`;
  }

  /**
   * Fetches the active space and publishes it on `activeSpace$`.
   *
   * Callers that arrive while a request is pending join it, so a page load sends one request (and
   * one retry sequence) however many consumers read the active space. A `fresh` caller needs a value
   * fetched after its call, so it starts a new request once the pending one settles. Requests stay
   * ordered, which means an older response can never overwrite a newer one.
   */
  private refreshActiveSpace({ fresh = false } = {}): Promise<void> {
    // Anonymous paths (such as login/logout) should not request the active space under any circumstances.
    if (this.isAnonymousPath()) {
      return Promise.resolve();
    }

    const pending = this.activeSpaceRequest;
    if (pending && !fresh) {
      return pending;
    }

    const fetched = pending
      ? pending.catch(() => {}).then(() => this.fetchActiveSpace())
      : this.fetchActiveSpace();
    const request: Promise<void> = fetched
      .then((activeSpace) => this.activeSpace$.next(activeSpace))
      .finally(() => {
        if (this.activeSpaceRequest === request) {
          this.activeSpaceRequest = undefined;
        }
      });
    this.activeSpaceRequest = request;
    return request;
  }

  // `activeSpace$` has a single producer, so giving up on the first transient failure strands every consumer on `null` for the rest of the page load.
  private async fetchActiveSpace(): Promise<Space> {
    let attempt = 0;
    while (true) {
      try {
        return await this.http.get<Space>('/internal/spaces/_active_space');
      } catch (error) {
        const status = getErrorStatus(error);
        const delay = ACTIVE_SPACE_RETRY_DELAYS_MS[attempt++];
        if (delay === undefined || !isRetryableStatus(status)) {
          // Log once per failed request. Without the active space the header space switcher stays
          // hidden for the rest of the page load, and some callers never surface the error.
          this.logger.error(
            `Failed to retrieve the active space after ${attempt} attempt(s) (status: ${
              status ?? 'no response'
            }): ${error instanceof Error ? error.message : String(error)}`
          );
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  private isAnonymousPath() {
    return this.http.anonymousPaths.isAnonymous(window.location.pathname);
  }

  public getContentForSpace(
    id: string
  ): Promise<{ summary: SpaceContentTypeSummaryItem[]; total: number }> {
    return this.http.get(`/internal/spaces/${encodeURIComponent(id)}/content_summary`);
  }

  public getRolesForSpace(id: string): Promise<Role[]> {
    return this.http.get(`/internal/security/roles/${encodeURIComponent(id)}`);
  }
}
