/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';

export class InMemoryStorage implements IStorageWrapper {
  private _data = new Map<string, unknown>();

  get = this._data.get.bind(this._data);

  set = this._data.set.bind(this._data);

  remove = this._data.delete.bind(this._data);

  clear = this._data.clear.bind(this._data);
}
