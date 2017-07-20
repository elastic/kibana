import _ from 'lodash';

export const Scanner = function (client, { index, type } = {}) {
  if (!index) throw new Error('Expected index');
  if (!type) throw new Error('Expected type');
  if (!client) throw new Error('Expected client');

  this.client = client;
  this.index = index;
  this.type = type;
};

Scanner.prototype.scanAndMap = function (searchString, options, mapFn) {
  const bool = { must: [], filter: [] };

  let scrollId;
  const allResults = {
    hits: [],
    total: 0
  };
  const opts = _.defaults(options || {}, {
    pageSize: 100,
    docCount: 1000
  });

  if (this.type) {
    bool.filter.push({
      bool: {
        should: [
          {
            term: {
              _type: this.type
            }
          },
          {
            term: {
              type: this.type
            }
          }
        ]
      }
    });
  }

  if (searchString) {
    bool.must.push({
      simple_query_string: {
        query: searchString + '*',
        fields: ['title^3', 'description'],
        default_operator: 'AND'
      }
    });
  } else {
    bool.must.push({
      match_all: {}
    });
  }

  return new Promise((resolve, reject) => {
    const getMoreUntilDone = (error, response) => {
      if (error) {
        reject(error);
        return;
      }
      const scanAllResults = opts.docCount === Infinity;
      allResults.total = scanAllResults ? response.hits.total : Math.min(response.hits.total, opts.docCount);
      scrollId = response._scroll_id || scrollId;

      let hits = response.hits.hits
      .slice(0, allResults.total - allResults.hits.length);

      hits = hits.map(hit => {
        if (hit._type === 'doc') {
          return {
            _id: hit._id.replace(`${this.type}:`, ''),
            _type: this.type,
            _source: hit._source[this.type],
            _meta: {
              savedObjectVersion: 2
            }
          };
        }

        return _.pick(hit, ['_id', '_type', '_source']);
      });

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
      size: opts.pageSize,
      body: { query: { bool } },
      scroll: '1m',
      sort: '_doc',
    }, getMoreUntilDone);
  });
};
