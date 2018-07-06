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

const Status = {
  AGGS: 'aggs',
  DATA: 'data',
  PARAMS: 'params',
  RESIZE: 'resize',
  TIME: 'time',
  UI_STATE: 'uiState',
};

// adapted from https://github.com/isaacs/json-stringify-safe/blob/02cfafd45f06d076ac4bf0dd28be6738a07a72f9/stringify.js
function serializer() {
  const stack = [];
  const keys = [];

  const cycleReplacer = function (key, value) {
    if (stack[0] === value) return '[Circular ~]';
    return `[Circular ~.${keys.slice(0, stack.indexOf(value)).join('.')}]`;
  };

  return function (key, value) {
    if (stack.length > 0) {
      const thisPos = stack.indexOf(this);
      ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
      ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
      if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value);
    }
    else stack.push(value);

    return value;
  };
}

function getUpdateStatus(requiresUpdateStatus, obj, param) {

  // If the vis type doesn't need update status, skip all calculations
  if (!requiresUpdateStatus) {
    return {};
  }

  if (!obj._oldStatus) {
    obj._oldStatus = {};
  }

  const hasChangedUsingGenericHashComparison = (name, value) => {
    const currentValue = JSON.stringify(value, serializer());
    if (currentValue !== obj._oldStatus[name]) {
      obj._oldStatus[name] = currentValue;
      return true;
    }
    return false;
  };

  const hasSizeChanged = (currentWidth, currentHeight) => {

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

  const hasDataChanged = (visData) => {
    const hash = calculateObjectHash(visData);
    if (hash !== obj._oldStatus.data) {
      obj._oldStatus.data = hash;
      return true;
    }
    return false;
  };

  const status = {};

  for (const requiredStatus of requiresUpdateStatus) {
    // Calculate all required status updates for this visualization
    switch (requiredStatus) {
      case Status.AGGS:
        status.aggs = hasChangedUsingGenericHashComparison('aggs', param.vis.aggs);
        break;
      case Status.DATA:
        status.data = hasDataChanged(param.visData);
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
        const time = param.vis.params.timeRange ? param.vis.params.timeRange : param.vis.API.timeFilter.getBounds();
        status.time = hasChangedUsingGenericHashComparison('time', time);
        break;
      case Status.UI_STATE:
        status.uiState = hasChangedUsingGenericHashComparison('uiState', param.uiState);
        break;
    }
  }

  return status;
}

export { getUpdateStatus, Status };
