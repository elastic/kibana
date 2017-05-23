import _ from 'lodash';
import { highlightTags } from './highlight_tags';

const FRAGMENT_SIZE = Math.pow(2, 31) - 1; // Max allowed value for fragment_size (limit of a java int)

/**
  * Returns a clone of the query with `"all_fields": true` set on any `query_string` queries
  */
function getHighlightQuery(query) {
  const clone = _.cloneDeep(query);

  if (
    _.has(clone, 'query_string')
    && !_.has(clone, ['query_string', 'default_field'])
    && !_.has(clone, ['query_string', 'fields'])
  ) {
    clone.query_string.all_fields = true;
  } else if (_.has(clone, 'bool.must')) {
    if (Array.isArray(clone.bool.must)) {
      clone.bool.must = clone.bool.must.map(getHighlightQuery);
    } else {
      clone.bool.must = getHighlightQuery(clone.bool.must);
    }
  }

  return clone;
}

export function getHighlightRequestProvider(config) {
  return function getHighlightRequest(query) {
    if (!config.get('doc_table:highlight')) return;

    const fieldsParams = config.get('doc_table:highlight:all_fields')
      ? { highlight_query: getHighlightQuery(query) }
      : {};

    return {
      pre_tags: [highlightTags.pre],
      post_tags: [highlightTags.post],
      fields: {
        '*': fieldsParams
      },
      fragment_size: FRAGMENT_SIZE
    };
  };
}
