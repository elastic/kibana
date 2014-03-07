define(function (require) {

  var _ = require('lodash');

  var nativeSetTimeout = window.setTimeout;
  var nativeClearTimeout = window.clearTimeout;

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

  function stubbedClient(respond) {
    respond = respond || function (method, params, cb) {
      var n = (params.body) ? Math.floor(params.body.split('\n').length / 2) : 0;
      cb(null, responses(n));
    };

    var stub = {
      callCount: 0,
      abortCalled: 0
    };

    _.each(['msearch', 'mget'], function (method) {
      stub[method] = function (params, cb) {
        stub[method].callCount++;
        stub.callCount ++;

        var id = nativeSetTimeout(_.partial(respond, method, params, cb), 3);
        return {
          abort: function () {
            nativeClearTimeout(id);
            stub.abortCalled ++;
          }
        };
      };
      stub[method].callCount = 0;
    });

    return stub;
  }

  stubbedClient.errorReponses = errorReponses;
  stubbedClient.responses = responses;

  return stubbedClient;

});