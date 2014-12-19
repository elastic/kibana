define(function (require) {
  var _ = require('lodash');
  var sinon = require('test_utils/auto_release_sinon');

  var Promise;
  var $rootScope;
  var fakeSource;
  var flatSource;
  var indexPattern;
  var SegmentedState;
  var requestQueue;
  var indices = [
    'logstash-2014.12.14',
    'logstash-2014.12.15',
    'logstash-2014.12.16',
    'logstash-2014.12.17',
    'logstash-2014.12.18'
  ];

  return ['SegmentedState class', function () {
    beforeEach(module('kibana'));
    beforeEach(inject(function ($injector, Private) {
      Promise = $injector.get('Promise');
      $rootScope = $injector.get('$rootScope');
      SegmentedState = Private(require('components/courier/fetch/segmented_state'));
      requestQueue = Private(require('components/courier/_request_queue'));

      flatSource = {
        index: indices,
        body: {
          query: {
            match_all: {}
          }
        }
      };

      indexPattern = Private(require('fixtures/stubbed_logstash_index_pattern'));
      indexPattern.toIndexList = _.constant(indices);

      fakeSource = {
        get: _.constant(indexPattern),
        _flatten: _.constant(Promise.resolve(flatSource)),
        _createRequest: function (requestersDefer) {
          return {
            source: this,
            defer: requestersDefer
          };
        }
      };
    }));

    describe('constructor', function () {
      it('flattens the source object', function () {
        var state = new SegmentedState(fakeSource);

        var flat;
        state.promiseForFlatSource.then(function (source) {
          flat = source;
        });
        $rootScope.$apply();

        expect(flat).to.be(flatSource);
      });

      it('calls the init argument', function () {
        var init = sinon.stub();
        var state = new SegmentedState(fakeSource, init);

        expect(init).to.have.property('callCount', 1);
        expect(init.getCall(0).args[0]).to.be(state);
      });

      it('handles non-function init arguments', function () {
        var state = new SegmentedState(fakeSource, {});
      });

      it('sets up the index queue', function () {
        var state = new SegmentedState(fakeSource);
        state.direction = 'asc';

        expect(state.all).to.eql(indices);
        expect(state.queue).to.eql(indices);

        state.complete.unshift(state.queue.shift());
        expect(state.all).to.eql(indices);
        expect(state.queue).to.eql(_.without(indices, indices[0]));
      });

      describe('', function () {
        require('test_utils/no_digest_promises').activateForSuite();

        it('sends a `null` status updated', function (done) {
          var state = new SegmentedState(fakeSource, function (state) {
            state.on('status', function (status) {
              expect(status).to.have.property('active', null);
              done();
            });
          });
        });
      });
    });

    describe('#getSourceStateFromRequest', function () {
      require('test_utils/no_digest_promises').activateForSuite();

      it('asynchronously returns a request state for each index', function () {
        var state = new SegmentedState(fakeSource);

        var req = fakeSource._createRequest(Promise.defer());

        return Promise.all([
          state.getSourceStateFromRequest(req),
          state.getSourceStateFromRequest(req),
          state.getSourceStateFromRequest(req)
        ])
        .then(function (requestStates) {
          requestStates.forEach(function (reqState, i, list) {
            expect(reqState.index).to.be(indices[i]);
            expect(reqState.body).to.eql(flatSource.body);
            expect(reqState.body).to.not.be(
              (list[i - 1] || flatSource).body
            );
          });
        });
      });

      it(
        'manages size, emits events, and produces mergedResponse ' +
        'until the last index in the queue, which causes the first ' +
        'requests defer object to be resolved with the final merged response',
        function (done) {
          this.timeout(0);
          var state = new SegmentedState(fakeSource);

          var userDefer = Promise.defer();

          var reqStates = [];
          var responses = [];

          var onEvent = sinon.stub();
          var events = 'status first segment mergedSegment complete'.split(' ');
          events.forEach(function (event) {
            state.on(event, function (val) {
              if (event === 'mergedSegment') val = _.cloneDeep(val);
              onEvent(event, val);
            });
          });


          function nextRequest(req) {
            req = req || fakeSource._createRequest(userDefer);

            state.getSourceStateFromRequest(req)
            .then(function (sourceState) {
              var resp;
              if (responses.length === 2) {
                resp = false; // mimic swallowed error
              } else {
                resp = {
                  hits: {
                    hits: new Array(10)
                  }
                };
              }

              reqStates.push(sourceState);
              responses.push(resp);
              req.defer.resolve(resp);
            });
          }

          // when pending requests are pushed into the pending
          // request queue, filter out the ones we are interested in
          sinon.stub(requestQueue, 'push', function (req) {
            if (req.segmented === state) nextRequest(req);
          });

          // kick off the request loop
          nextRequest();

          userDefer.promise.then(function (finalResponse) {
            indices = indices.slice(0);

            var total = indices.length;
            expect(reqStates).to.have.length(total);

            function event(name) {
              var args = onEvent.args.shift();
              expect(args[0]).to.be(name);
              return args[1];
            }

            for (var i = 0; i < total; i++) {
              var index = indices.shift();
              var reqState = reqStates.shift();
              var response = responses.shift();

              var num = i + 1;
              var remaining = indices.length;

              // we always get a status
              var status = event('status');
              // only firt on the first
              var first = num === 1 ? event('first') : null;
              // third request is for a closed index, so no segment
              var segment = num !== 3 ? event('segment') : null;
              // third request is for a closed index, so no segment
              var mergedSegment = num !== 3 ? event('mergedSegment') : null;
              // only complete on last
              var complete = remaining === 0 ? event('complete') : null;

              expect(status).to.have.property('total', total);
              expect(status).to.have.property('complete', i);
              expect(status).to.have.property('remaining', remaining);
              expect(status).to.have.property('active', index);

              if (segment) {
                expect(segment).to.be(response);
              }

              if (mergedSegment) {
                expect(mergedSegment).to.not.be(response);

                // account for the closed index/missing segment
                var expectedHits = (num < 3 ? num : num - 1) * response.hits.hits.length;
                expect(mergedSegment.hits.hits.length).to.be(expectedHits);
              }
            }
          })
          .nodeify(done);
        }
      );

    });
  }];
});