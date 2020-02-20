/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

export const _vents = {};
export const vents = {
  vents: _vents,
  on: function(id, cb) {
    if (!_.isArray(_vents[id])) {
      _vents[id] = [];
    }
    _vents[id].push(cb);
  },
  clear: function(id) {
    delete _vents[id];
  },
  trigger: function() {
    const args = Array.prototype.slice.call(arguments);
    const id = args.shift();
    if (_vents[id]) {
      _.each(_vents[id], function(cb) {
        cb.apply(null, args);
      });
    }
  },
};
