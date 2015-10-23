define(function (require) {
  const _ = require('lodash');
  const moment = require('moment');

  return function CalculateIndicesFactory(Promise, es) {

    // Uses the field stats api to determine the names of indices that need to
    // be queried against that match the given pattern and fall within the
    // given time range
    function calculateIndices(...args) {
      const options = compileOptions(...args);
      return sendRequest(options);
    };

    // creates the configuration hash that must be passed to the elasticsearch
    // client
    function compileOptions(pattern, timeFieldName, start, stop) {
      const constraints = {};
      if (start) {
        constraints.min_value = { gte: moment(start).valueOf() };
      }
      if (stop) {
        constraints.max_value = { lt: moment(stop).valueOf() };
      }

      return {
        method: 'POST',
        path: `/${pattern}/_field_stats`,
        query: {
          level: 'indices'
        },
        body: {
          fields: [ timeFieldName ],
          index_constraints: {
            [timeFieldName]: constraints
          }
        }
      };
    }

    // executes a request to elasticsearch with the given configuration hash
    function sendRequest(options) {
      return new Promise(function (resolve, reject) {
        es.transport.request(options, function (err, response) {
          if (err) return reject(err);
          var indices = _.map(response.indices, function (info, index) {
            return index;
          });
          resolve(indices);
        });
      });
    }

    return calculateIndices;
  };
});
