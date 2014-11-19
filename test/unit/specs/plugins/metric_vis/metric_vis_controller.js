define(function (require) {
  var metricVis = {
    aggs: [{
      type: {name: 'count'},
      schema: 'metric',
      makeLabel: function () {
        return 'Count of documents';
      }
    }]
  };

  var averageVis = {
    aggs: [{
      id: 'agg',
      type: {name: 'average'},
      schema: 'metric',
      makeLabel: function () {
        return 'Average bytes';
      }
    }]
  };

  describe('metric vis', function () {
    var $scope;

    beforeEach(module('kibana/metric_vis'));
    beforeEach(inject(function ($rootScope, $controller) {
      $scope = $rootScope.$new();
      $controller('KbnMetricVisController', {$scope: $scope});
      $scope.$digest();
    }));

    it('should set the metric', function () {
      expect($scope).to.have.property('metric');
    });

    it('should set the metric label and value for count', function () {
      expect($scope.metric.label).to.not.be.ok();
      expect($scope.metric.value).to.not.be.ok();

      $scope.vis = metricVis;
      $scope.esResponse = {hits: {total: 4826}};
      $scope.$digest();

      expect($scope.metric.label).to.be('Count of documents');
      expect($scope.metric.value).to.be($scope.esResponse.hits.total);
    });

    it('should set the metric value for average', function () {
      expect($scope.metric.label).to.not.be.ok();
      expect($scope.metric.value).to.not.be.ok();

      $scope.vis = averageVis;
      $scope.esResponse = {hits: {total: 4826}, aggregations: {agg: {value: 1234}}};
      $scope.$digest();

      expect($scope.metric.label).to.be('Average bytes');
      expect($scope.metric.value).to.be($scope.esResponse.aggregations.agg.value);
    });
  });
});