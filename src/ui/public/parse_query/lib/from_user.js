import _ from 'lodash';
import { getDefaultQuery, getTextQuery } from './query_utils';

/**
 * Take query from the user and make it into a query object
 * @param {query} user's query input
 * @returns {object}
 */
export function fromUser(query) {
  if (!_.isString(query) || query.trim() === '') {
    return getDefaultQuery();
  }

  try {
    const parsedQuery = JSON.parse(query);
    if (_.isObject(parsedQuery)) {
      if (Object.keys(parsedQuery).length) {
        return parsedQuery;
      }
      return getDefaultQuery();
    }
    return getTextQuery(query);
  } catch (e) {
    return getTextQuery(query);
  }
}
