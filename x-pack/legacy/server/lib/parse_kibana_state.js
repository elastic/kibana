/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import { isPlainObject, omit, get } from 'lodash';
import rison from 'rison-node';

const stateTypeKeys = {
  global: '_g',
  app: '_a',
};

class KibanaState {
  constructor(query, type = 'global') {
    const propId = stateTypeKeys[type];
    if (!isPlainObject(query)) throw new TypeError('Query parameter must be an object');
    if (!propId) throw new TypeError(`Unknown state type: '${type}'`);

    const queryValue = query[propId];

    this.exists = Boolean(queryValue);
    this.state = queryValue ? rison.decode(queryValue) : {};
    this.type = type;
  }

  removeProps(props) {
    this.state = omit(this.state, props);
  }

  get(prop, defVal) {
    return get(this.state, prop, defVal);
  }

  set(prop, val) {
    return set(this.state, prop, val);
  }

  toString() {
    return rison.encode(this.state);
  }

  toQuery() {
    const index = stateTypeKeys[this.type];
    const output = {};
    output[index] = this.toString();
    return output;
  }
}

export function parseKibanaState(query, type) {
  return new KibanaState(query, type);
}
