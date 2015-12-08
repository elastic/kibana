var _ = require('lodash');

var Scanner = function (client, {index, type}) {
  if (!index) throw new Error('Expected index');
  if (!type) throw new Error('Expected type');
  if (!client) throw new Error('Expected client');

  this.client = client;
  this.index = index;
  this.type = type;
};

Scanner.prototype.scanAndMap = function (searchString, options, mapFn) {
  const opts = _.defaults({
    pageSize: 100,
    docCount: 1000
  }, options);

  var allResults = {
    hits: [],
    total: 0
  };

  var body;
  if (searchString) {
    body = {
      query: {
        simple_query_string: {
          query: searchString + '*',
          fields: ['title^3', 'description'],
          default_operator: 'AND'
        }
      }
    };
  } else {
    body = { query: {match_all: {}}};
  }

  return new Promise((resolve, reject) => {
    this.client.search({
      index: this.index,
      type: this.type,
      size: opts.pageSize,
      body,
      searchType: 'scan',
      scroll: '1m'
    }, function getMoreUntilDone(error, response) {
      var scanAllResults = opts.docCount === Number.POSITIVE_INFINITY;
      allResults.total = scanAllResults ? response.hits.total : Math.min(response.hits.total, opts.docCount);

      var hits = response.hits.hits
      .slice(0, allResults.total - allResults.hits.length);
      if (mapFn) hits = hits.map(mapFn);

      allResults.hits =  allResults.hits.concat(hits);

      var collectedAllResults = allResults.total === allResults.hits.length;
      if (collectedAllResults) {
        resolve(allResults);
      } else {
        this.client.scroll({
          scrollId: response._scroll_id,
        }, getMoreUntilDone);
      }
    });
  });
};

export default Scanner;
