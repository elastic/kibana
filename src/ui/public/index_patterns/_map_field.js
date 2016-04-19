import _ from 'lodash';
import IndexPatternsCastMappingTypeProvider from 'ui/index_patterns/_cast_mapping_type';
export default function MapFieldFn(Private, config) {
  let castMappingType = Private(IndexPatternsCastMappingTypeProvider);

  /**
   * Accepts a field object and its name, and tries to give it a mapping
   * @param  {Object} field - the field mapping returned by elasticsearch
   * @param  {String} type - name of the field
   * @return {Object} - the resulting field after overrides and tweaking
   */
  return function mapField(field, name) {
    let keys = Object.keys(field.mapping);
    if (keys.length === 0 || (name[0] === '_') && !_.contains(config.get('metaFields'), name)) return;

    // Override the mapping, even if elasticsearch says otherwise
    let mappingOverrides = {
      _source: { type: '_source' },
      _index: { type: 'string' },
      _type: { type: 'string' },
      _id: { type: 'string' },
      _timestamp: {
        type: 'date',
        indexed: true
      },
      _score: {
        type: 'number',
        indexed: false
      }
    };

    let mapping = _.cloneDeep(field.mapping[keys.shift()]);

    if (!mapping.index || mapping.index === 'no') {
      // elasticsearch responds with false sometimes and 'no' others
      mapping.indexed = false;
    } else {
      mapping.indexed = true;
    }

    mapping.analyzed = mapping.index === 'analyzed' || mapping.type === 'text';

    mapping.type = castMappingType(mapping.type);

    if (mappingOverrides[name]) {
      _.merge(mapping, mappingOverrides[name]);
    }

    return mapping;
  };
};
