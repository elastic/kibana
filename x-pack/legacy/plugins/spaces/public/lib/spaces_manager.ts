/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';
import { NotificationsSetup, HttpSetup } from 'src/core/public';
import { SavedObjectsManagementRecord } from 'ui/management/saved_objects_management';
import { Space } from '../../common/model/space';
import { GetSpacePurpose } from '../../common/model/types';
import { CopySavedObjectsToSpaceResponse } from './copy_saved_objects_to_space/types';

export class SpacesManager extends EventEmitter {
  private activeSpace: Space | undefined;

  constructor(
    private readonly spaceSelectorURL: string,
    private readonly http: HttpSetup,
    private readonly notifications: NotificationsSetup
  ) {
    super();
  }

  public async getSpaces(purpose?: GetSpacePurpose): Promise<Space[]> {
    return await this.http.get('/api/spaces/space', { query: { purpose } });
  }

  public async getSpace(id: string): Promise<Space> {
    return await this.http.get(`/api/spaces/space/${encodeURIComponent(id)}`);
  }

  public async getActiveSpace(forceRefresh: boolean = false): Promise<Space> {
    if (!this.activeSpace || forceRefresh) {
      this.activeSpace = (await this.http.get('/api/spaces/v1/activeSpace')) as Space;
    }
    return this.activeSpace;
  }

  public async createSpace(space: Space) {
    return this.http
      .post(`/api/spaces/space`, {
        body: JSON.stringify(space),
      })
      .then(() => this.requestRefresh());
  }

  public async updateSpace(space: Space) {
    return this.http
      .put(`/api/spaces/space/${encodeURIComponent(space.id)}`, {
        query: {
          overwrite: true,
        },
        body: JSON.stringify(space),
      })
      .then(() => this.requestRefresh());
  }

  public async deleteSpace(space: Space) {
    return this.http
      .delete(`/api/spaces/space/${encodeURIComponent(space.id)}`)
      .then(() => this.requestRefresh());
  }

  public async copySavedObjects(
    objects: Array<Pick<SavedObjectsManagementRecord, 'type' | 'id'>>,
    spaces: string[],
    includeReferences: boolean,
    overwrite: boolean
  ): Promise<CopySavedObjectsToSpaceResponse> {
    return this.http.post('/api/spaces/_copy_saved_objects', {
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
    return this.http.post(`/api/spaces/_resolve_copy_saved_objects_errors`, {
      body: JSON.stringify({
        objects,
        includeReferences,
        retries,
      }),
    });
  }

  public async changeSelectedSpace(space: Space) {
    await this.http
      .post(`/api/spaces/v1/space/${encodeURIComponent(space.id)}/select`)
      .then(response => {
        if (response.location) {
          window.location = response.location;
        } else {
          this._displayError();
        }
      })
      .catch(() => this._displayError());
  }

  public redirectToSpaceSelector() {
    window.location.href = this.spaceSelectorURL;
  }

  public async requestRefresh() {
    this.emit('request_refresh');
  }

  public _displayError() {
    this.notifications.toasts.addDanger({
      title: i18n.translate('xpack.spaces.spacesManager.unableToChangeSpaceWarningTitle', {
        defaultMessage: 'Unable to change your Space',
      }),
      text: i18n.translate('xpack.spaces.spacesManager.unableToChangeSpaceWarningDescription', {
        defaultMessage: 'please try again later',
      }),
    });
  }
}
