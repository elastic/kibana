import _ from 'lodash';

/**
 * Utilize the extended error information returned from elasticsearch
 * @param  {Error|String} err
 * @returns {string}
 */
export default function formatESMsg(err) {
  var rootCause = _.get(err, 'resp.error.root_cause');
  if (!rootCause) {
    return; //undefined
  }

  var result = _.pluck(rootCause, 'reason').join('\n');
  return result;
};
