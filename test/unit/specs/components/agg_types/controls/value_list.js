define(function (require) {
  describe('PercentList directive', function () {
    var $ = require('jquery');
    var _ = require('lodash');
    var simulateKeys = require('test_utils/simulate_keys');

    require('components/agg_types/controls/_values_list');

    var $el;
    var $scope;
    var compile;

    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector) {
      var $compile = $injector.get('$compile');
      var $rootScope = $injector.get('$rootScope');

      $scope = $rootScope.$new();
      $el = $('<div>').append(
        $('<input>')
          .attr('ng-model', 'vals[$index]')
          .attr('ng-repeat', 'val in vals')
          .attr('values-list', 'vals')
          .attr('values-list-min', '0')
          .attr('values-list-max', '100')
      );
      compile = function (vals) {
        $scope.vals = vals || [];
        $compile($el)($scope);
        $scope.$apply();
      };
    }));

    afterEach(function () {
      $el.remove();
      $scope.$destroy();
    });

    it('fails on invalid numbers', function () {
      compile([1, 'foo']);
      expect($scope.vals).to.eql([1, undefined]);
      expect($el.find('.ng-invalid').size()).to.be(1);
    });

    it('supports decimals', function () {
      compile(['1.2', '000001.6', '99.10']);
      expect($scope.vals).to.eql([1.2, 1.6, 99.1]);
    });

    it('ensures that the values are in order', function () {
      compile([1, 2, 3, 10, 4, 5]);
      expect($scope.vals).to.eql([1, 2, 3, undefined, 4, 5]);
      expect($el.find('.ng-invalid').size()).to.be(1);
    });

    describe('ensures that the values are between 0 and 100', function () {
      it(': -1', function () {
        compile([-1, 1]);
        expect($scope.vals).to.eql([undefined, 1]);
        expect($el.find('.ng-invalid').size()).to.be(1);
      });

      it(': 0', function () {
        compile([0, 1]);
        expect($scope.vals).to.eql([undefined, 1]);
        expect($el.find('.ng-invalid').size()).to.be(1);
      });

      it(': 0.0001', function () {
        compile([0.0001, 1]);
        expect($scope.vals).to.eql([0.0001, 1]);
        expect($el.find('.ng-invalid').size()).to.be(0);
      });

      it(': 99.9999999', function () {
        compile([1, 99.9999999]);
        expect($scope.vals).to.eql([1, 99.9999999]);
        expect($el.find('.ng-invalid').size()).to.be(0);
      });

      it(': 101', function () {
        compile([1, 101]);
        expect($scope.vals).to.eql([1, undefined]);
        expect($el.find('.ng-invalid').size()).to.be(1);
      });
    });

    describe('listens for keyboard events', function () {
      it('up arrow increases by 1', function () {
        compile([1]);

        return simulateKeys(
          function () { return $el.find('input').first(); },
          ['up', 'up', 'up']
        )
        .then(function () {
          expect($scope.vals).to.eql([4]);
        });
      });

      it('shift-up increases by 0.1', function () {
        compile([4.8]);

        var seq = [
          {
            type: 'press',
            key: 'shift',
            events: [
              'up',
              'up',
              'up'
            ]
          }
        ];

        return simulateKeys(
          function () { return $el.find('input').first(); },
          seq
        )
        .then(function () {
          expect($scope.vals).to.eql([5.1]);
        });
      });

      it('down arrow decreases by 1', function () {
        compile([5]);

        return simulateKeys(
          function () { return $el.find('input').first(); },
          ['down', 'down', 'down']
        )
        .then(function () {
          expect($scope.vals).to.eql([2]);
        });
      });

      it('shift-down decreases by 0.1', function () {
        compile([5.1]);

        var seq = [
          {
            type: 'press',
            key: 'shift',
            events: [
              'down',
              'down',
              'down'
            ]
          }
        ];

        return simulateKeys(
          function () { return $el.find('input').first(); },
          seq
        )
        .then(function () {
          expect($scope.vals).to.eql([4.8]);
        });
      });

      it('maintains valid number', function () {
        compile([9, 11, 13]);

        var seq = [
          'down', // 10 (11 - 1)
          'down'  // 10 (limited by 9)
        ];

        var getEl = function () { return $el.find('input').eq(1); };

        return simulateKeys(getEl, seq)
        .then(function () {
          expect($scope.vals).to.eql([9, 10, 13]);
        });
      });
    });
  });
});