/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { BaseWatch } from './base_watch';
import { WATCH_TYPES } from '../../../../../common/constants';

/**
 * {@code MonitoringWatch} system defined watches created by the Monitoring plugin.
 */
export class MonitoringWatch extends BaseWatch {
  constructor(props = {}) {
    props.type = WATCH_TYPES.MONITORING;
    super(props);
  }

  get upstreamJson() {
    const result = super.upstreamJson;
    Object.assign(result, {
      watch: this.watch
    });

    return result;
  }

  static fromUpstreamJson(upstreamWatch) {
    return new MonitoringWatch(upstreamWatch);
  }

  static isCreatable = false;
}
