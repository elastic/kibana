/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

export class WatchErrors {
  constructor(props = {}) {
    this.actionErrors = get(props, 'actions');
  }

  static fromUpstreamJson(upstreamWatchErrors) {
    return new WatchErrors(upstreamWatchErrors);
  }
}
