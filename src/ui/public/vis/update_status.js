const oldValues = [];

const hasChanged = (name, value) => {
  const currentValue = JSON.stringify(value);
  if (currentValue !== oldValues[name]) {
    oldValues[name] = currentValue;
    return false;
  }
  return true;
};

const getUpdateStatus = ($scope) => {
  const status = {
    aggs: hasChanged('aggs', $scope.vis.aggs),
    data: hasChanged('data', $scope.visData),
    params: hasChanged('param', $scope.vis.params),
    resize: hasChanged('resize', $scope.vis.size),
    uiState: hasChanged('uiState', $scope.uiState)
  };

  return status;
};

module.exports = { getUpdateStatus };
