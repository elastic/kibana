/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EventEmitter } from 'events';

class MapAdapter extends EventEmitter {
  setMapState({ stats, style }) {
    this.stats = stats;
    this.style = style;
    this._onChange();
  }

  getMapState() {
    return { stats: this.stats, style: this.style };
  }

  _onChange() {
    this.emit('change');
  }
}

export { MapAdapter };
