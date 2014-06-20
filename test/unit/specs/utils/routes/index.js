define(function (require) {
  var _ = require('lodash');
  var RouteManager = require('routes').RouteManager;
  var routes; // will contain an new instance of RouteManager for each test

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
        var otherRoute = {};
        routes.otherwise({});
        routes.otherwise(otherRoute);

        var exec;
        routes.config({
          otherwise: function (route) {
            expect(route).to.be(otherRoute);
            exec = true;
          }
        });

        expect(exec).to.be.ok();
      });
    });

    describe('#when', function () {
      it('should merge the additions into the when() defined routes', function () {
        routes.when('/some/route');
        routes.when('/some/other/route');

        // add the addition resolve to every route
        routes.addResolves(/.*/, {
          addition: function () {}
        });

        var exec = 0;
        routes.config({
          when: function (path, route) {
            exec ++;
            // every route should have the "addition" resolve
            expect(route.resolve.addition).to.be.a('function');
          }
        });
        // we expect two routes to be sent to the $routeProvider
        expect(exec).to.be(2);
      });
    });

    describe('#config', function () {
      it('should add defined routes to the global $routeProvider service in order', function () {
        var args = [
          ['/one', {}],
          ['/two', {}]
        ];

        args.forEach(function (a) {
          routes.when(a[0], a[1]);
        });

        routes.config({
          when: function (path, route) {
            var a = args.shift();
            expect(path).to.be(a[0]);
            expect(route).to.be(a[1]);
          }
        });
      });

      it('sets route.reloadOnSearch to false by default', function () {
        routes.when('/nothing-set');
        routes.when('/no-reload', { reloadOnSearch: false });
        routes.when('/always-reload', { reloadOnSearch: true });

        var exec = 0;

        routes.config({
          when: function (path, route) {
            exec ++;
            // true for the one route, false for all others
            expect(route.reloadOnSearch).to.be(path === '/always-reload');
          }
        });
        // we expect two routes to be sent to the $routeProvider
        expect(exec).to.be(3);
      });
    });

    require('./work_queue')();
  });
});