/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EventEmitter } from 'events';
import { kfetch } from 'ui/kfetch';
import { SavedObjectsManagementRecord } from '../../../../../../src/legacy/core_plugins/management/public';
import { Space } from '../../common/model/space';
import { GetSpacePurpose } from '../../common/model/types';
import { CopySavedObjectsToSpaceResponse } from './copy_saved_objects_to_space/types';
import { ENTER_SPACE_PATH } from '../../common/constants';
import { addSpaceIdToPath } from '../../../../../plugins/spaces/common';

export class SpacesManager extends EventEmitter {
  constructor(private readonly serverBasePath: string) {
    super();
  }

  public async getSpaces(purpose?: GetSpacePurpose): Promise<Space[]> {
    return await kfetch({ pathname: '/api/spaces/space', query: { purpose } });
  }

  public async getSpace(id: string): Promise<Space> {
    return await kfetch({ pathname: `/api/spaces/space/${encodeURIComponent(id)}` });
  }

  public async createSpace(space: Space) {
    return await kfetch({
      pathname: `/api/spaces/space`,
      method: 'POST',
      body: JSON.stringify(space),
    });
  }

  public async updateSpace(space: Space) {
    return await kfetch({
      pathname: `/api/spaces/space/${encodeURIComponent(space.id)}`,
      query: {
        overwrite: true,
      },
      method: 'PUT',
      body: JSON.stringify(space),
    });
  }

  public async deleteSpace(space: Space) {
    return await kfetch({
      pathname: `/api/spaces/space/${encodeURIComponent(space.id)}`,
      method: 'DELETE',
    });
  }

  public async copySavedObjects(
    objects: Array<Pick<SavedObjectsManagementRecord, 'type' | 'id'>>,
    spaces: string[],
    includeReferences: boolean,
    overwrite: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return await kfetch({
      pathname: `/api/spaces/_copy_saved_objects`,
      method: 'POST',
      body: JSON.stringify({
        objects,
        spaces,
        includeReferences,
        overwrite,
      }),
    });
  }

  public async resolveCopySavedObjectsErrors(
    objects: Array<Pick<SavedObjectsManagementRecord, 'type' | 'id'>>,
    retries: unknown,
    includeReferences: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return await kfetch({
      pathname: `/api/spaces/_resolve_copy_saved_objects_errors`,
      method: 'POST',
      body: JSON.stringify({
        objects,
        includeReferences,
        retries,
      }),
    });
  }

  public async changeSelectedSpace(space: Space) {
    window.location.href = addSpaceIdToPath(this.serverBasePath, space.id, ENTER_SPACE_PATH);
  }

  public redirectToSpaceSelector() {
    window.location.href = `${this.serverBasePath}/spaces/space_selector`;
  }

  public async requestRefresh() {
    this.emit('request_refresh');
  }
}
