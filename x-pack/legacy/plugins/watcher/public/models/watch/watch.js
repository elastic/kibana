/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, set } from 'lodash';
import { WATCH_TYPES } from '../../../common/constants';
import { JsonWatch } from './json_watch';
import { ThresholdWatch } from './threshold_watch';
import { MonitoringWatch } from './monitoring_watch';

const WatchTypes = {};
set(WatchTypes, WATCH_TYPES.JSON, JsonWatch);
set(WatchTypes, WATCH_TYPES.THRESHOLD, ThresholdWatch);
set(WatchTypes, WATCH_TYPES.MONITORING, MonitoringWatch);

export class Watch {
  static getWatchTypes = () => {
    return WatchTypes;
  };

  static fromUpstreamJson(upstreamWatch = {}) {
    const type = get(upstreamWatch, 'type');
    const WatchType = WatchTypes[type];

    Object.assign(upstreamWatch, {
      isNew: false,
    });

    return WatchType.fromUpstreamJson(upstreamWatch);
  }
}
