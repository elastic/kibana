const _ = require('lodash');

let Scanner = function (client, {index, type} = {}) {
  if (!index) throw new Error('Expected index');
  if (!type) throw new Error('Expected type');
  if (!client) throw new Error('Expected client');

  this.client = client;
  this.index = index;
  this.type = type;
};

Scanner.prototype.scanAndMap = function (searchString, options, mapFn) {
  let scrollId;
  let body;
  let allResults = {
    hits: [],
    total: 0
  };
  const opts = _.defaults(options || {}, {
    pageSize: 100,
    docCount: 1000
  });

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
    const getMoreUntilDone = (error, response) => {
      const scanAllResults = opts.docCount === Infinity;
      allResults.total = scanAllResults ? response.hits.total : Math.min(response.hits.total, opts.docCount);
      scrollId = response._scroll_id || scrollId;

      let hits = response.hits.hits
      .slice(0, allResults.total - allResults.hits.length);
      if (mapFn) hits = hits.map(mapFn);

      allResults.hits =  allResults.hits.concat(hits);

      const collectedAllResults = allResults.total === allResults.hits.length;
      if (collectedAllResults) {
        resolve(allResults);
      } else {
        this.client.scroll({
          scrollId
        }, getMoreUntilDone);
      }
    };

    this.client.search({
      index: this.index,
      type: this.type,
      size: opts.pageSize,
      body,
      searchType: 'scan',
      scroll: '1m'
    }, getMoreUntilDone);
  });
};

export default Scanner;
