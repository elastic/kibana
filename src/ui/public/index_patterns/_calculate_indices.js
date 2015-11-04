define(function (require) {
  const _ = require('lodash');
  const moment = require('moment');

  return function CalculateIndicesFactory(Promise, es) {

    // Uses the field stats api to determine the names of indices that need to
    // be queried against that match the given pattern and fall within the
    // given time range
    function calculateIndices(pattern, timeFieldName, start, stop, sortDirection) {
      return getFieldStats(pattern, timeFieldName, start, stop)
      .then(resp => sortIndexStats(resp, timeFieldName, sortDirection));
    };

    // creates the configuration hash that must be passed to the elasticsearch
    // client
    function getFieldStats(pattern, timeFieldName, start, stop) {
      const constraints = {};
      if (start) {
        constraints.max_value = { gte: moment(start).valueOf() };
      }
      if (stop) {
        constraints.min_value = { lte: moment(stop).valueOf() };
      }

      return es.fieldStats({
        index: pattern,
        level: 'indices',
        body: {
          fields: [ timeFieldName ],
          index_constraints: {
            [timeFieldName]: constraints
          }
        }
      });
    }

    function sortIndexStats(resp, timeFieldName, sortDirection) {
      if (!sortDirection) return _.keys(resp.indices);

      // FIXME: Once https://github.com/elastic/elasticsearch/issues/14404 is closed
      // this should be sorting based on the sortable value of a field.
      const edgeKey = sortDirection === 'desc' ? 'max_value' : 'min_value';

      return _(resp.indices)
      .map((stats, index) => (
        { index, edge: stats.fields[timeFieldName][edgeKey] }
      ))
      .sortByOrder(['edge'], [sortDirection])
      .pluck('index')
      .value();
    }

    return calculateIndices;
  };
});
