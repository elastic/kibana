define(function (require) {
  return function transformMappingIntoFields(Private, kbnIndex, config) {
    let _ = require('lodash');
    let mapField = Private(require('ui/index_patterns/_map_field'));


    /**
     * Convert the ES response into the simple map for fields to
     * mappings which we will cache
     *
     * @param  {object} response - complex, excessively nested
     *                           object returned from ES
     * @return {object} - simple object that works for all of kibana
     *                    use-cases
     */
    return function (response) {
      let fields = {};
      _.each(response, function (index, indexName) {
        if (indexName === kbnIndex) return;
        _.each(index.mappings, function (mappings) {
          _.each(mappings, function (field, name) {
            let keys = Object.keys(field.mapping);
            if (keys.length === 0 || (name[0] === '_') && !_.contains(config.get('metaFields'), name)) return;

            let mapping = mapField(field, name);

            if (fields[name]) {
              if (fields[name].type !== mapping.type) {
                // conflict fields are not available for much except showing in the discover table
                mapping.type = 'conflict';
                mapping.indexed = false;
              }
            }
            fields[name] = _.pick(mapping, 'type', 'indexed', 'analyzed', 'doc_values');
          });
        });
      });

      config.get('metaFields').forEach(function (meta) {
        if (fields[meta]) return;

        let field = { mapping: {} };
        field.mapping[meta] = {};
        fields[meta] = mapField(field, meta);
      });

      return _.map(fields, function (mapping, name) {
        mapping.name = name;
        return mapping;
      });
    };
  };
});
