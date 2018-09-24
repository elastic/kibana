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

import _ from 'lodash';

export class SavedObject {
  constructor(client, { id, type, version, attributes, error, migrationVersion } = {}) {
    this._client = client;
    this.id = id;
    this.type = type;
    this.attributes = attributes || {};
    this._version = version;
    this.migrationVersion = migrationVersion;
    if (error) {
      this.error = error;
    }
  }

  get(key) {
    return _.get(this.attributes, key);
  }

  set(key, value) {
    return _.set(this.attributes, key, value);
  }

  has(key) {
    return _.has(this.attributes, key);
  }

  save() {
    if (this.id) {
      return this._client.update(this.type, this.id, this.attributes, { migrationVersion: this.migrationVersion });
    } else {
      return this._client.create(this.type, this.attributes, { migrationVersion: this.migrationVersion });
    }
  }

  delete() {
    return this._client.delete(this.type, this.id);
  }
}
