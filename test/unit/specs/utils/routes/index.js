define(function (require) {
  var angular = require('angular');
  var _ = require('lodash');
  var RouteManager = require('routes').RouteManager;
  var routes; // will contain an new instance of RouteManager for each test
  var sinon = require('test_utils/auto_release_sinon');
  var getRouteProvider = require('./_get_route_provider');
  var chainableMethods = [
    { name: 'when', args: ['', {}] },
    { name: 'otherwise', args: [{}] },
    { name: 'addResolves', args: [/regexp/, {}] }
  ];

  describe('Custom Route Management', function () {
    beforeEach(function () {
      routes = new RouteManager();
    });

    it('should have chainable methods: ' + _.pluck(chainableMethods, 'name').join(', '), function () {
      chainableMethods.forEach(function (meth) {
        expect(routes[meth.name].apply(routes, _.clone(meth.args))).to.be(routes);
      });
    });

    describe('#otherwise', function () {
      it('should forward the last otherwise route', function () {
        var $rp = getRouteProvider();
        var otherRoute = {};
        routes.otherwise({});
        routes.otherwise(otherRoute);

        routes.config($rp);

        expect($rp.otherwise.callCount).to.be(1);
        expect($rp.otherwise.getCall(0).args[0]).to.be(otherRoute);
      });
    });

    describe('#when', function () {
      it('should merge the additions into the when() defined routes', function () {
        var $rp = getRouteProvider();
        routes.when('/some/route');
        routes.when('/some/other/route');

        // add the addition resolve to every route
        routes.addResolves(/.*/, {
          addition: function () {}
        });

        routes.config($rp);

        // should have run once for each when route
        expect($rp.when.callCount).to.be(2);
        expect($rp.otherwise.callCount).to.be(0);

        // every route should have the "addition" resolve
        expect($rp.when.getCall(0).args[1].resolve.addition).to.be.a('function');
        expect($rp.when.getCall(1).args[1].resolve.addition).to.be.a('function');
      });
    });

    describe('#config', function () {
      it('should add defined routes to the global $routeProvider service in order', function () {
        var $rp = getRouteProvider();
        var args = [
          ['/one', {}],
          ['/two', {}]
        ];

        args.forEach(function (a) {
          routes.when(a[0], a[1]);
        });

        routes.config($rp);

        expect($rp.when.callCount).to.be(args.length);
        _.times(args.length, function (i) {
          var call = $rp.when.getCall(i);
          var a = args.shift();

          expect(call.args[0]).to.be(a[0]);
          expect(call.args[1]).to.be(a[1]);
        });
      });

      it('sets route.reloadOnSearch to false by default', function () {
        var $rp = getRouteProvider();
        routes.when('/nothing-set');
        routes.when('/no-reload', { reloadOnSearch: false });
        routes.when('/always-reload', { reloadOnSearch: true });

        var exec = 0;

        routes.config($rp);

        expect($rp.when.callCount).to.be(3);
        expect($rp.when.firstCall.args[1]).to.have.property('reloadOnSearch', false);
        expect($rp.when.secondCall.args[1]).to.have.property('reloadOnSearch', false);
        expect($rp.when.lastCall.args[1]).to.have.property('reloadOnSearch', true);
      });
    });

    require('specs/utils/routes/_work_queue')();
    require('specs/utils/routes/_wrap_route_with_prep')();
  });
});