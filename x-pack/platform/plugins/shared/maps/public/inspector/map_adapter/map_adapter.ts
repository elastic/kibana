/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EventEmitter } from 'events';
import { Stats } from './types';

class MapAdapter extends EventEmitter {
  private stats?: Stats;
  private style?: string;

  setMapState({ stats, style }: { stats: Stats; style: string }) {
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
