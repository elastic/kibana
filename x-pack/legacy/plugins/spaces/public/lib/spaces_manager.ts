/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { EventEmitter } from 'events';
import { NotificationsSetup, HttpSetup } from 'src/core/public';
import { Space } from '../../common/model/space';

export class SpacesManager extends EventEmitter {
  private activeSpace: Space | undefined;

  constructor(
    private readonly spaceSelectorURL: string,
    private readonly http: HttpSetup,
    private readonly notifications: NotificationsSetup
  ) {
    super();
  }

  public async getSpaces(): Promise<Space[]> {
    return await this.http.get('/api/spaces/space');
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
