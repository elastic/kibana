define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  var es;
  var Promise;
  var strategy;
  var nextState;
  var configFile;
  var clientErrors;
  var searchStrategy;
  var SegmentedState;
  var stubedSegmentedState;

  return ['segmented fetch strategy', function () {
    beforeEach(module('kibana', function (PrivateProvider) {
      // stub the SegmentedState class
      PrivateProvider.swap(
        require('components/courier/fetch/segmented_state'),
        function StubbedSegmentedStateProvider() {
          return sinon.spy(function SegmentedState() {
            stubedSegmentedState = this;
            this.getSourceStateFromRequest = sinon.stub().returns(nextState = {});
          });
        }
      );
    }));

    beforeEach(inject(function ($injector, Private) {
      es = $injector.get('es');
      Promise = $injector.get('Promise');
      strategy = Private(require('components/courier/fetch/strategy/segmented'));
      configFile = $injector.get('configFile');
      clientErrors = $injector.get('esFactory').errors;
      searchStrategy = Private(require('components/courier/fetch/strategy/search'));
      SegmentedState = Private(require('components/courier/fetch/segmented_state'));
    }));

    function ClientError(status, message) {
      var err = new clientErrors[status](message);
      err.status = status;
      return err;
    }

    describe('#clientMethod', function () {
      require('test_utils/no_digest_promises').activateForSuite();

      it('describes an actual method on the client', function () {
        expect(es[strategy.clientMethod]).to.be.a('function');
      });

      it('filters out "index closed" errors', function () {
        var filteredError = new ClientError(403, 'ClusterBlockException because index closed');
        sinon.stub(es, 'msearch').returns(Promise.reject(filteredError));
        var football = {};

        return es[strategy.clientMethod](football)
        .then(function shouldExec(resp) {
          expect(resp).to.be(false);
          expect(es.msearch).to.have.property('callCount', 1);
          expect(es.msearch.getCall(0).args[0]).to.be(football);
        })
        .catch(function shouldNotExec() {
          expect().fail('The error should have been swallowed');
        });
      });

      it('lets other errors through', function () {
        var notFilteredError = new ClientError(500);
        sinon.stub(es, 'msearch').returns(Promise.reject(notFilteredError));
        var football = {};

        return es[strategy.clientMethod](football)
        .then(function shouldNotExec() {
          expect().fail('The error should have been swallowed');
        })
        .catch(function shouldExec(err) {
          expect(err).to.be(notFilteredError);
          expect(es.msearch).to.have.property('callCount', 1);
          expect(es.msearch.args[0][0]).to.be(football);
        });
      });
    });

    describe('#getSourceStateFromRequest', function () {
      it('instanciates the SegmentedState, calls getSourceStateFromRequest on it', function () {
        var req = {
          source: {},
          defer: {},
          segmented: true,
          init: _.noop
        };

        expect(SegmentedState).to.have.property('callCount', 0);

        var state = strategy.getSourceStateFromRequest(req);

        expect(SegmentedState).to.have.property('callCount', 1);

        var call = SegmentedState.getCall(0);
        expect(call.args[0]).to.be(req.source);
        expect(call.args[1]).to.be(req.init);

        expect(req.segmented).to.be(stubedSegmentedState);
        expect(stubedSegmentedState.getSourceStateFromRequest).to.have.property('callCount', 1);
        expect(state).to.be(nextState);
      });

      it('reuses the SegmentedState, calls getSourceStateFromRequest on it', function () {
        var req = {
          source: {},
          defer: {},
          segmented: true,
          init: _.noop
        };

        expect(SegmentedState).to.have.property('callCount', 0);

        var state = strategy.getSourceStateFromRequest(req);

        expect(SegmentedState).to.have.property('callCount', 1);

        var call = SegmentedState.getCall(0);
        expect(call.args[0]).to.be(req.source);
        expect(call.args[1]).to.be(req.init);

        expect(req.segmented).to.be(stubedSegmentedState);
        expect(stubedSegmentedState.getSourceStateFromRequest).to.have.property('callCount', 1);
        expect(state).to.be(nextState);
      });
    });

    describe('#convertStatesToBody', function () {
      it('reads the states into new-line delimited json with proper search params', function () {
        var states = [
          { index: 'index', type: 'type', body: { req: 'body' } },
          { index: 'index', type: 'type', body: { req: 'body' } },
          { index: 'index', type: 'type', body: { req: 'body' } }
        ];
        var count = states.length;

        var expectedBody = { req: 'body' };
        var expectedParams = {
          index: 'index',
          type: 'type',
          ignore_unavailable: true,
          timeout: configFile.shard_timeout
        };

        var docs = strategy.convertStatesToBody(states).split('\n').filter(Boolean);
        expect(docs).to.have.length(6);

        _.times(count, function () {
          var params = docs.shift();
          var body = docs.shift();

          expect(JSON.parse(body)).to.eql(expectedBody);
          expect(JSON.parse(params)).to.eql(expectedParams);
        });

      });
    });

    describe('#getIncompleteRequests', function () {
      it('exists', function () {
        expect(strategy.getIncompleteRequests).to.be.a('function');
      });

      it('filters out pending requests that have SegmentedState attached', function () {
        var fakeSearchSource = {
          _getType: _.constant('search')
        };

        var target = {
          source: fakeSearchSource,
          segmented: new SegmentedState()
        };

        var requests = _.shuffle([
          target,
          {
            source: fakeSearchSource,
            segmented: true
          },
          {
            source: fakeSearchSource,
            segmented: false
          }
        ]);

        var pending = strategy.getIncompleteRequests(requests);
        expect(pending).to.have.length(1);
        expect(pending[0]).to.be(target);
      });
    });
  }];
});