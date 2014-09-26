define(function (require) {
  var angular = require('angular');
  var $ = require('jquery');
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');
  var getFakeRow = require('fixtures/fake_row');


  // Load the kibana app dependencies.
  require('angular-route');

  require('apps/discover/index');

  var $parentScope, $scope, config;

  // Stub out a minimal mapping of 3 fields
  var mapping = {
    bytes: {
      indexed: true,
      type: 'number'
    },
    request: {
      indexed: false,
      type: 'string'
    },
    timestamp: {
      indexed: true,
      type: 'date'
    },
  };

  // Sets up the directive, take an element, and a list of properties to attach to the parent scope.
  var init = function ($elem, props) {
    module('kibana');
    inject(function ($rootScope, $compile, _config_) {
      config = _config_;
      $parentScope = $rootScope;
      _.assign($parentScope, props);
      $compile($elem)($parentScope);
      $elem.scope().$digest();
      $scope = $elem.isolateScope();
    });
  };

  var destroy = function () {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  // For testing column removing/adding for the header and the rows
  //
  var columnTests = function (elemType, parentElem) {
    it('should create only the toggle column by default', function (done) {
      var childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(1);
      done();
    });

    it('should create a time column if the timefield is defined', function (done) {
      // Should include a column for toggling and the time column by default
      $parentScope.timefield = 'timestamp';
      parentElem.scope().$digest();
      var childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(2);
      done();
    });

    it('should be able to add and remove columns', function (done) {
      var childElems;
      // Should include a column for toggling and the time column by default
      $parentScope.columns = ['bytes'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(2);
      expect($(childElems[1]).text()).to.contain('bytes');

      $parentScope.columns = ['bytes', 'request'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(3);
      expect($(childElems[2]).text()).to.contain('request');

      $parentScope.columns = ['request'];
      parentElem.scope().$digest();
      childElems = parentElem.find(elemType);
      expect(childElems.length).to.be(2);
      expect($(childElems[1]).text()).to.contain('request');
      done();
    });
  };


  describe('discover table directives', function () {

    describe('kbnTableHeader', function () {

      var $elem = angular.element(
        '<thead kbn-table-header columns="columns" mapping="mapping" sort="sort" timefield="timefield"></thead>'
      );

      beforeEach(function () {
        init($elem, {
          mapping: mapping,
          columns: [],
          sorting: [],
        });
      });
      afterEach(function () {
        destroy();
      });

      describe('adding and removing columns', function () {
        columnTests('th', $elem);
      });


      describe('sorting', function () {
        it('should have a sort function that sets the elements of the sort array', function (done) {
          expect($scope.sort).to.be.a(Function);
          done();
        });

        it('should have a headClasser function that determines the css classes of the sort icons', function (done) {
          expect($scope.headerClass).to.be.a(Function);
          done();
        });

        it('should sort asc by default, then by desc if already sorting', function (done) {
          var field = 'bytes';

          // Should not be sorted at first
          expect($scope.sorting).to.eql(undefined);
          expect($scope.headerClass(field)).to.contain('fa-sort');

          $scope.sort(field);
          expect($scope.sorting).to.eql([field, 'asc']);
          expect($scope.headerClass(field)).to.contain('fa-sort-up');

          $scope.sort(field);
          expect($scope.sorting).to.eql([field, 'desc']);
          expect($scope.headerClass(field)).to.contain('fa-sort-down');

          $scope.sort(field);
          expect($scope.sorting).to.eql([field, 'asc']);
          expect($scope.headerClass(field)).to.contain('fa-sort-up');

          // Should show the default sort for any other field
          expect($scope.headerClass('timestamp')).to.contain('fa-sort');

          done();
        });

        it('should NOT sort unindexed fields', function (done) {
          $scope.sort('request');
          expect($scope.sorting).to.be(undefined);
          done();
        });

      });

      describe('moving columns', function () {
        beforeEach(function () {
          $parentScope.columns = _.keys($scope.mapping);
          $elem.scope().$digest();
        });

        it('should move columns to the right', function () {

          $scope.moveRight('bytes');
          expect($scope.columns[1]).to.be('bytes');

          $scope.moveRight('bytes');
          expect($scope.columns[2]).to.be('bytes');
        });

        it('shouldnt move the last column to the right', function () {
          expect($scope.columns[2]).to.be('timestamp');

          $scope.moveRight('timestamp');
          expect($scope.columns[2]).to.be('timestamp');
        });

        it('should move columns to the left', function () {
          $scope.moveLeft('timestamp');
          expect($scope.columns[1]).to.be('timestamp');

          $scope.moveLeft('request');
          expect($scope.columns[1]).to.be('request');
        });

        it('shouldnt move the first column to the left', function () {
          expect($scope.columns[0]).to.be('bytes');

          $scope.moveLeft('bytes');
          expect($scope.columns[0]).to.be('bytes');
        });
      });

    });

    describe('kbnTable', function () {

      var $elem = angular.element(
        '<kbn-table ' +
        'columns="columns" ' +
        'rows="rows" ' +
        'sorting="sorting"' +
        'filtering="filtering"' +
        'maxLength=maxLength ' +
        'mapping="mapping"' +
        'timefield="timefield" ' +
        '></thead>'
      );

      beforeEach(function () {

        // A tiny window
        sinon.stub($.prototype, 'height', function () { return 100; });

        // Convince the infinite scroll that there's still a lot of room left.
        sinon.stub($.prototype, 'scrollTop', function () { return -200; });

        var rows = _.times(200, function (i) {
          return getFakeRow(i, mapping);
        });
        init($elem, {
          columns: ['bytes'],
          rows: rows,
          sorting: [],
          filtering: sinon.spy(),
          maxLength: 50,
          mapping: mapping,
          timefield: 'timestamp'
        });
      });
      afterEach(function () {
        destroy();
      });

      it('should have a header and a table element', function (done) {
        expect($elem.find('thead').length).to.be(1);
        expect($elem.find('table').length).to.be(1);

        done();
      });

      it('should have 50 rows to start', function (done) {
        var tr = $elem.find('.discover-table-row');
        expect(tr.length).to.be(50);
        done();
      });

      it('should have an addRows function that adds 50 rows', function (done) {
        expect($scope.addRows).to.be.a(Function);
        $scope.addRows();
        $elem.scope().$digest();

        var tr = $elem.find('.discover-table-row');
        expect(tr.length).to.be(100);
        done();
      });

    });


    describe('kbnTableRow', function () {

      var $elem = angular.element(
        '<tr kbn-table-row="row" ' +
        'columns="columns" ' +
        'sorting="sorting"' +
        'filtering="filtering"' +
        'mapping="mapping"' +
        'timefield="timefield" ' +
        '></tr>'
      );

      beforeEach(function () {

        init($elem, {
          row: getFakeRow(0, mapping),
          columns: [],
          sorting: [],
          filtering: sinon.spy(),
          maxLength: 50,
          mapping: mapping,
        });

        // Ignore the metaFields (_id, _type, etc) since we don't have a mapping for them
        sinon.stub(config, 'get').withArgs('metaFields').returns([]);

      });
      afterEach(function () {
        destroy();
      });

      describe('adding and removing columns', function () {
        columnTests('td', $elem);
      });

      describe('details row', function () {
        it('should be an empty tr by default', function () {
          expect($elem.next().is('tr')).to.be(true);
          expect($elem.next().text()).to.be('');
        });
      });

      describe('details row', function () {
        it('should be an empty tr by default', function () {
          expect($elem.next().is('tr')).to.be(true);
          expect($elem.next().text()).to.be('');
        });

        it('should expand the detail row when the toggle arrow is clicked', function () {
          $elem.children(':first-child').click();
          $scope.$digest();
          expect($elem.next().text()).to.not.be('');
        });

        describe('expanded', function () {
          var $details;
          beforeEach(function () {
            // Open the row
            $scope.toggleRow();
            $scope.$digest();
            $details = $elem.next();
          });
          afterEach(function () {
            // Close the row
            $scope.toggleRow();
            $scope.$digest();
          });

          it('should be a tr', function () {
            expect($details.is('tr')).to.be(true);
          });

          it('should have a row for each field', function () {
            var rows = $details.find('tr');
            var row = $scope.row;
            expect($details.find('tr').length).to.be(3);
          });

          it('should have a row for each field', function () {
            var rows = $details.find('tr');
            var row = $scope.row;
            expect($details.find('tr').length).to.be(3);
          });

          describe('filtering', function () {
            it('should filter when you click on the filter buttons', function () {
              $details.find('.fa-search-plus').first().click();
              expect($scope.filtering.calledOnce).to.be(true);
              $details.find('.fa-search-minus').first().click();
              expect($scope.filtering.calledTwice).to.be(true);
            });
          });

        });

      });


    });


  });

});
