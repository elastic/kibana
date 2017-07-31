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
  const hasChanged = (name, value) => {
    const currentValue = JSON.stringify(value, serializer());
    if (currentValue !== $scope._oldStatus[name]) {
      $scope._oldStatus[name] = currentValue;
      return true;
    }
    return false;
  };

  function hasSizeChanged(oldStatus, newSize) {
    if (!newSize) {
      return true;
    }
    if (!oldStatus.size) {//initialize
      oldStatus.size = newSize.slice();
      return true;
    }
    const hasChanged = oldStatus.size[0] !== newSize[0] || oldStatus.size[1] !== newSize[1];
    oldStatus.size = newSize.slice();
    return hasChanged;
  }

  return {
    aggs: hasChanged('aggs', $scope.vis.aggs),
    data: hasChanged('data', $scope.visData),
    params: hasChanged('param', $scope.vis.params),
    resize: hasSizeChanged($scope._oldStatus, $scope.vis.size),
    uiState: hasChanged('uiState', $scope.uiState)
  };
};

module.exports = { getUpdateStatus };
