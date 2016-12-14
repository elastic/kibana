import _ from 'lodash';
import IndexPatternsMapFieldProvider from 'ui/index_patterns/_map_field';
import { ConflictTracker } from 'ui/index_patterns/_conflict_tracker';

export default function transformMappingIntoFields(Private, kbnIndex, config) {
  const mapField = Private(IndexPatternsMapFieldProvider);

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
    const fields = {};
    const conflictTracker = new ConflictTracker();

    _.each(response, function (index, indexName) {
      if (indexName === kbnIndex) return;
      _.each(index.mappings, function (mappings) {
        _.each(mappings, function (field, name) {
          const keys = Object.keys(field.mapping);
          if (keys.length === 0 || (name[0] === '_') && !_.contains(config.get('metaFields'), name)) return;

          const mapping = mapField(field, name);
          // track the name, type and index for every field encountered so that the source
          // of conflicts can be described later
          conflictTracker.trackField(name, mapping.type, indexName);

          if (fields[name]) {
            if (fields[name].type !== mapping.type) {
              // conflict fields are not available for much except showing in the discover table
              // overwrite the entire mapping object to reset all fields
              fields[name] = { type: 'conflict' };
            }
          } else {
            fields[name] = _.pick(mapping, 'type', 'indexed', 'analyzed', 'doc_values');
          }
        });
      });
    });

    config.get('metaFields').forEach(function (meta) {
      if (fields[meta]) return;

      const field = { mapping: {} };
      field.mapping[meta] = {};
      fields[meta] = mapField(field, meta);
    });

    return _.map(fields, function (mapping, name) {
      mapping.name = name;

      if (mapping.type === 'conflict') {
        mapping.conflictDescriptions = conflictTracker.describeConflict(name);
      }

      return mapping;
    });
  };
}
