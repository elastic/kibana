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

function getUpdateStatus(requiresUpdateStatus, $scope) {

  // If the vis type doesn't need update status, skip all calculations
  if (!requiresUpdateStatus) {
    return {};
  }

  if (!$scope._oldStatus) {
    $scope._oldStatus = {};
  }

  const hasChangedUsingGenericHashComparison = (name, value) => {
    const currentValue = JSON.stringify(value, serializer());
    if (currentValue !== $scope._oldStatus[name]) {
      $scope._oldStatus[name] = currentValue;
      return true;
    }
    return false;
  };

  function hasSizeChanged(currentWidth, currentHeight) {

    if (!$scope._oldStatus.resize) {
      $scope._oldStatus.resize = { width: currentWidth, height: currentHeight };
      return true;
    }

    if (currentWidth !== $scope._oldStatus.resize.width || currentHeight !== $scope._oldStatus.resize.height) {
      $scope._oldStatus.resize = { width: currentWidth, height: currentHeight };
      return true;
    }
    return false;
  }

  function hasDataChanged(visData) {
    const hash = calculateObjectHash(visData);
    if (hash !== $scope._oldStatus.data) {
      $scope._oldStatus.data = hash;
      return true;
    }
    return false;
  }

  const status = {};

  for (const requiredStatus of requiresUpdateStatus) {
    // Calculate all required status updates for this visualization
    switch (requiredStatus) {
      case Status.AGGS:
        status.aggs = hasChangedUsingGenericHashComparison('aggs', $scope.vis.aggs);
        break;
      case Status.DATA:
        status.data = hasDataChanged($scope.visData);
        break;
      case Status.PARAMS:
        status.params = hasChangedUsingGenericHashComparison('param', $scope.vis.params);
        break;
      case Status.RESIZE:
        const width = $scope.vis.size ? $scope.vis.size[0] : 0;
        const height = $scope.vis.size ? $scope.vis.size[1] : 0;
        status.resize = hasSizeChanged(width, height);
        break;
      case Status.TIME:
        const time = $scope.vis.params.timeRange ? $scope.vis.params.timeRange : $scope.vis.API.timeFilter.getBounds();
        status.time = hasChangedUsingGenericHashComparison('time', time);
        break;
      case Status.UI_STATE:
        status.uiState = hasChangedUsingGenericHashComparison('uiState', $scope.uiState);
        break;
    }
  }

  return status;
}

export { getUpdateStatus, Status };
