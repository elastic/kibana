define(function (require) {
  const _ = require('lodash');
  const moment = require('moment');

  // gets parsed value if given arg is a moment object
  function timeValue(val) {
    return moment.isMoment(val) ? val.valueOf() : val;
  }

  // returns a properly formatted millisecond timestamp index constraint
  function msConstraint(comparison, value) {
    return {
      [comparison]: timeValue(value),
      format: 'epoch_millis'
    };
  }

  // returns a new object with any indexes removed that do not include the
  // time field
  //
  // fixme: this really seems like a bug that needs to be fixed in
  //        elasticsearch itself, but this workaround will do for now
  function omitIndicesWithoutTimeField(indices, timeFieldName) {
    return _.pick(indices, index => index.fields[timeFieldName]);
  }

  return function CalculateIndicesFactory(Promise, es) {

    // Uses the field stats api to determine the names of indices that need to
    // be queried against that match the given pattern and fall within the
    // given time range
    function calculateIndices(pattern, timeFieldName, start, stop, sortDirection) {
      return getFieldStats(pattern, timeFieldName, start, stop)
      .then(resp => resp.indices)
      .then(indices => omitIndicesWithoutTimeField(indices, timeFieldName))
      .then(indices => sortIndexStats(indices, timeFieldName, sortDirection));
    };

    // creates the configuration hash that must be passed to the elasticsearch
    // client
    function getFieldStats(pattern, timeFieldName, start, stop) {
      const constraints = {};
      if (start) {
        constraints.max_value = msConstraint('gte', start);
      }
      if (stop) {
        constraints.min_value = msConstraint('lte', stop);
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

    function sortIndexStats(indices, timeFieldName, sortDirection) {
      if (!sortDirection) return _.keys(indices);

      // FIXME: Once https://github.com/elastic/elasticsearch/issues/14404 is closed
      // this should be sorting based on the sortable value of a field.
      const edgeKey = sortDirection === 'desc' ? 'max_value' : 'min_value';

      return _(indices)
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
