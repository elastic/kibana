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

import { calculateObjectHash } from './lib/calculate_object_hash';
import { Vis } from './vis';

enum Status {
  AGGS = 'aggs',
  DATA = 'data',
  PARAMS = 'params',
  RESIZE = 'resize',
  TIME = 'time',
  UI_STATE = 'uiState',
}

function getUpdateStatus<T extends Status>(
  requiresUpdateStatus: T[] = [],
  obj: any,
  param: { vis: Vis; visData: any; uiState: any }
): { [reqStats in T]: boolean } {
  const status = {} as { [reqStats in T]: boolean };

  // If the vis type doesn't need update status, skip all calculations
  if (requiresUpdateStatus.length === 0) {
    return status;
  }

  if (!obj._oldStatus) {
    obj._oldStatus = {};
  }

  const hasChangedUsingGenericHashComparison = (name: string, value: any) => {
    const hash = calculateObjectHash(value);
    if (hash !== obj._oldStatus[name]) {
      obj._oldStatus[name] = hash;
      return true;
    }
    return false;
  };

  const hasSizeChanged = (currentWidth: number, currentHeight: number) => {
    if (!obj._oldStatus.resize) {
      obj._oldStatus.resize = { width: currentWidth, height: currentHeight };
      return true;
    }

    if (currentWidth !== obj._oldStatus.resize.width || currentHeight !== obj._oldStatus.resize.height) {
      obj._oldStatus.resize = { width: currentWidth, height: currentHeight };
      return true;
    }
    return false;
  };

  for (const requiredStatus of requiresUpdateStatus) {
    // Calculate all required status updates for this visualization
    switch (requiredStatus) {
      case Status.AGGS:
        status.aggs = hasChangedUsingGenericHashComparison('aggs', param.vis.aggs);
        break;
      case Status.DATA:
        status.data = hasChangedUsingGenericHashComparison('data', param.visData);
        break;
      case Status.PARAMS:
        status.params = hasChangedUsingGenericHashComparison('param', param.vis.params);
        break;
      case Status.RESIZE:
        const width = param.vis.size ? param.vis.size[0] : 0;
        const height = param.vis.size ? param.vis.size[1] : 0;
        status.resize = hasSizeChanged(width, height);
        break;
      case Status.TIME:
        status.time = hasChangedUsingGenericHashComparison('time', param.vis.filters.timeRange);
        break;
      case Status.UI_STATE:
        status.uiState = hasChangedUsingGenericHashComparison('uiState', param.uiState);
        break;
    }
  }

  return status;
}

export { getUpdateStatus, Status };
