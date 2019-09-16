/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Url from 'url';

import Axios, { AxiosRequestConfig } from 'axios';
import { ToolingLog } from '@kbn/dev-utils';

const joinPath = (...components: Array<string | undefined>) =>
  `/${components
    .filter(s => !!s)
    .map(c => encodeURIComponent(c))
    .join('/')}`;

type MigrationVersion = Record<string, string>;

interface Reference {
  id: string;
  name: string;
  type: string;
}

interface SavedObjectResponse<Attributes extends Record<string, any>> {
  attributes: Attributes;
  id: string;
  migrationVersion?: MigrationVersion;
  references: Reference[];
  type: string;
  updated_at?: string;
  version?: string;
}

interface GetOptions {
  type: string;
  id: string;
}

interface IndexOptions<Attributes> {
  type: string;
  attributes: Attributes;
  id?: string;
  overwrite?: boolean;
  migrationVersion?: MigrationVersion;
  references?: Reference[];
}

interface UpdateOptions<Attributes> extends IndexOptions<Attributes> {
  id: string;
}

export class KibanaServerSavedObjects {
  private readonly x = Axios.create({
    baseURL: Url.resolve(this.url, '/api/saved_objects/'),
    headers: {
      'kbn-xsrf': 'KibanaServerSavedObjects',
    },
  });

  constructor(private readonly url: string, private readonly log: ToolingLog) {}

  /**
   * Get an object
   */
  public async get<Attributes extends Record<string, any>>(options: GetOptions) {
    this.log.debug('Gettings saved object: %j', options);
    return await this.request<SavedObjectResponse<Attributes>>('get saved object', {
      url: joinPath(options.type, options.id),
      method: 'GET',
    });
  }

  /**
   * Create a saved object
   */
  public async create<Attributes extends Record<string, any>>(options: IndexOptions<Attributes>) {
    this.log.debug('Updating saved object: %j', options);

    return await this.request<SavedObjectResponse<Attributes>>('update saved object', {
      url: joinPath(options.type, options.id),
      params: {
        overwrite: options.overwrite,
      },
      method: 'POST',
      data: {
        attributes: options.attributes,
        migrationVersion: options.migrationVersion,
        references: options.references,
      },
    });
  }

  /**
   * Update a saved object
   */
  public async update<Attributes extends Record<string, any>>(options: UpdateOptions<Attributes>) {
    this.log.debug('Updating saved object: %j', options);

    return await this.request<SavedObjectResponse<Attributes>>('update saved object', {
      url: joinPath(options.type, options.id),
      params: {
        overwrite: options.overwrite,
      },
      method: 'PUT',
      data: {
        attributes: options.attributes,
        migrationVersion: options.migrationVersion,
        references: options.references,
      },
    });
  }

  /**
   * Delete an object
   */
  public async delete(options: GetOptions) {
    this.log.debug('Deleting saved object %s/%s', options);

    return await this.request('delete saved object', {
      url: joinPath(options.type, options.id),
      method: 'DELETE',
    });
  }

  private async request<T>(desc: string, options: AxiosRequestConfig) {
    try {
      const resp = await this.x.request<T>(options);
      return resp.data;
    } catch (error) {
      if (error.response) {
        throw new Error(`Failed to ${desc}:\n${JSON.stringify(error.response.data, null, 2)}`);
      }

      throw error;
    }
  }
}
