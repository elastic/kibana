import { calculateObjectHash } from './lib/calculate_object_hash';

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

const getUpdateStatus = ($scope) => {

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

  const time = $scope.vis.params.timeRange ? $scope.vis.params.timeRange : $scope.vis.API.timeFilter.getBounds();
  const width = $scope.vis.size ? $scope.vis.size[0] : 0;
  const height = $scope.vis.size ? $scope.vis.size[1] : 0;
  return {
    aggs: hasChangedUsingGenericHashComparison('aggs', $scope.vis.aggs),
    data: hasDataChanged($scope.visData),
    params: hasChangedUsingGenericHashComparison('param', $scope.vis.params),
    resize: hasSizeChanged(width, height),
    time: hasChangedUsingGenericHashComparison('time', time),
    uiState: hasChangedUsingGenericHashComparison('uiState', $scope.uiState)
  };
};

export { getUpdateStatus };
