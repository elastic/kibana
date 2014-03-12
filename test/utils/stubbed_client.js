define(function (require) {
  var _ = require('lodash');

  var nativeSetTimeout = window.setTimeout;
  var nativeClearTimeout = window.clearTimeout;
  var methodsToStub = [
    'msearch',
    'mget',
    'index',
    'update',
    'delete'
  ];

  var defaultResponses = {
    msearch: function (params, cb) {
      cb(null, responses(countMultiRequests(params)));
    },
    mget: function (params, cb) {
      cb(null, responses(countMultiRequests(params)));
    }
  };

  /**
   * Create a "client" that will mock several functions
   * but really just defers to the `respond` method. In many cases
   * (so far) very simple logic is required to push empty/irrelevent
   * responses back (which is more than fine for the courier)
   *
   * @param  {[type]} respond - a function that will be called after a short
   *   timeout to respond in place of a stubbed method.
   * @return {[type]}         [description]
   */
  function StubbedClient(responder) {
    if (!(this instanceof StubbedClient)) return new StubbedClient(responder);

    var stub = this;

    stub.__responder = responder || defaultResponses;

    if (typeof this.__responder === 'object') {
      // transform the responder object into a function that can be called like the others
      stub.__responder = (function (options) {
        return function (method, params, cb) {
          if (options[method]) return options[method](params, cb);
          if (options.default) return options.default(method, params, cb);
          throw new Error('responder for "default" or "' + method + '" required');
        };
      })(stub.__responder);
    }

    stub.callCount = 0;
    stub.abortCalled = 0;

    methodsToStub.forEach(function (method) {
      // count every call to this method
      stub[method].callCount = 0;
    });

    return stub;
  }

  methodsToStub.forEach(function (method) {
    // create a stub for each method
    StubbedClient.prototype[method] = function (params, cb) {
      var stub = this;

      // increment global counters
      stub.callCount ++;
      // inc this method's counter
      stub[method].callCount++;

      if (typeof params === 'function') {
        // allow calling with just a callback
        cb = params;
        params = {};
      }

      // call the responder after 3 ms to simulate a very quick response
      var id = nativeSetTimeout(_.partial(stub.__responder, method, params, cb), 3);

      // return an aborter, that has a short but reasonable amount of time to be called
      return {
        abort: function () {
          nativeClearTimeout(id);
          stub.abortCalled ++;
        }
      };
    };
  });

  // cound the number of requests in a multi request bulk body
  function countMultiRequests(params) {
    return (params.body) ? Math.floor(params.body.split('\n').length / 2) : 0;
  }

  // create a generic response for N requests
  function responses(n) {
    var resp = [];
    _.times(n, function () {
      resp.push({
        hits: {
          hits: []
        }
      });
    });
    return { responses: resp };
  }

  // create a generic response with errors for N requests
  function errorReponses(n) {
    var resp = [];
    _.times(n, function () {
      resp.push({ error: 'search error' });
    });
    return { responses: resp };
  }

  // create a generic response with a single doc, that uses
  // the passed in response but fills in some defaults
  function doc(d) {
    d = _.defaults(d || {}, {
      found: true,
      _version: 1,
      _source: {}
    });

    return {
      docs: [ d ]
    };
  }

  StubbedClient.errorReponses = errorReponses;
  StubbedClient.responses = responses;
  StubbedClient.doc = doc;

  return StubbedClient;

});