/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isString } from 'lodash';

export class ExportTypesRegistry {
  constructor() {
    this._map = new Map();
  }

  register(item) {
    if (!isString(item.id)) {
      throw new Error(`'item' must have a String 'id' property `);
    }

    if (this._map.has(item.id)) {
      throw new Error(`'item' with id ${item.id} has already been registered`);
    }

    this._map.set(item.id, item);
  }

  getAll() {
    return this._map.values();
  }

  getSize() {
    return this._map.size;
  }

  getById(id) {
    if (!this._map.has(id)) {
      throw new Error(`Unknown id ${id}`);
    }

    return this._map.get(id);
  }

  get(callback) {
    let result;
    for (const value of this._map.values()) {
      if (!callback(value)) {
        continue;
      }

      if (result) {
        throw new Error('Found multiple items matching predicate.');
      }

      result = value;
    }

    if (!result) {
      throw new Error('Found no items matching predicate');
    }

    return result;
  }
}
