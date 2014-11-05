define(function (require) {
  var angular = require('angular');

  // Load the kibana app dependencies.
  require('angular-route');

  // Load kibana and its applications
  require('plugins/discover/index');

  var rison;
  var risonDecode;

  var init = function (expandable) {
    // Load the application
    module('kibana');

    // Create the scope
    inject(function ($filter) {
      rison = $filter('rison');
      risonDecode = $filter('risonDecode');
    });
  };

  describe('rison filters', function () {
    var testObj = {
      time: {
        from: 'now-15m',
        to: 'now'
      }
    };
    var testRison = '(time:(from:now-15m,to:now))';

    beforeEach(function () {
      init();
    });

    describe('rison', function () {
      it('should have the filter', function () {
        expect(rison).to.not.be(null);
      });

      it('should rison encode data', function () {
        expect(rison(testObj)).to.be(testRison);
      });
    });

    describe('risonDecode', function () {
      it('should have the filter', function () {
        expect(risonDecode).to.not.be(null);
      });

      it('should decode rison data', function () {
        expect(risonDecode(testRison)).to.eql(testObj);
      });
    });
  });
});
