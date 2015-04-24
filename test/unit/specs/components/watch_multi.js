define(function (require) {
  describe('$scope.$watchMulti', function () {
    var sinon = require('test_utils/auto_release_sinon');

    var $rootScope;
    var $scope;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      $rootScope = $injector.get('$rootScope');
      $scope = $rootScope.$new();
    }));

    it('exposes $watchMulti on all scopes', function () {
      expect($rootScope.$watchMulti).to.be.a('function');
      expect($scope).to.have.property('$watchMulti', $rootScope.$watchMulti);

      var $isoScope = $scope.$new(true);
      expect($isoScope).to.have.property('$watchMulti', $rootScope.$watchMulti);
    });

    it('only triggers a single watch on initialization', function () {
      var stub = sinon.stub();

      $scope.$watchMulti([
        'one',
        'two',
        'three'
      ], stub);
      $rootScope.$apply();

      expect(stub.callCount).to.be(1);
    });

    it('only triggers a single watch when multiple values change', function () {
      var stub = sinon.spy(function (a, b) {});

      $scope.$watchMulti([
        'one',
        'two',
        'three'
      ], stub);

      $rootScope.$apply();
      expect(stub.callCount).to.be(1);

      $scope.one = 'a';
      $scope.two = 'b';
      $scope.three = 'c';
      $rootScope.$apply();

      expect(stub.callCount).to.be(2);
    });

    it('passes an array of the current values as the first arg, and an array of the previous values as the second',
    function () {
      var stub = sinon.spy(function (a, b) {});

      $scope.one = 'a';
      $scope.two = 'b';
      $scope.three = 'c';
      $scope.$watchMulti([
        'one',
        'two',
        'three'
      ], stub);

      $rootScope.$apply();
      expect(stub.firstCall.args).to.eql([
        ['a', 'b', 'c'],
        ['a', 'b', 'c']
      ]);

      $scope.one = 'do';
      $scope.two = 're';
      $scope.three = 'mi';
      $rootScope.$apply();

      expect(stub.secondCall.args).to.eql([
        ['do', 're', 'mi'],
        ['a', 'b', 'c']
      ]);
    });

    it('the current value is always up to date', function () {
      var count = 0;

      $scope.vals = [1, 0];
      $scope.$watchMulti([ 'vals[0]', 'vals[1]' ], function (cur, prev) {
        expect(cur).to.eql($scope.vals);
        count++;
      });

      var $child = $scope.$new();
      $child.$watch('vals[0]', function (cur) {
        $child.vals[1] = cur;
      });

      $rootScope.$apply();
      expect(count).to.be(2);
    });
  });
});
