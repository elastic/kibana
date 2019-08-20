/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { toastNotifications } from 'ui/notify';
import { EventEmitter } from 'events';
import { kfetch } from 'ui/kfetch';
import { Space } from '../../common/model/space';

export class SpacesManager extends EventEmitter {
  private spaceSelectorURL: string;

  constructor(spaceSelectorURL: string) {
    super();
    this.spaceSelectorURL = spaceSelectorURL;
  }

  public async getSpaces(purpose: 'any' | 'copySavedObjects' = 'any'): Promise<Space[]> {
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
    objects: unknown,
    spaces: string[],
    includeReferences: boolean,
    overwrite: boolean
  ) {
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
    objects: unknown,
    retries: unknown,
    includeReferences: boolean
  ) {
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
    await kfetch({
      pathname: `/api/spaces/v1/space/${encodeURIComponent(space.id)}/select`,
      method: 'POST',
    })
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
    toastNotifications.addDanger({
      title: i18n.translate('xpack.spaces.spacesManager.unableToChangeSpaceWarningTitle', {
        defaultMessage: 'Unable to change your Space',
      }),
      text: i18n.translate('xpack.spaces.spacesManager.unableToChangeSpaceWarningDescription', {
        defaultMessage: 'please try again later',
      }),
    });
  }
}
