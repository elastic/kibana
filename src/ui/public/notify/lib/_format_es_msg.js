import _ from 'lodash';

/**
 * Utilize the extended error information returned from elasticsearch
 * @param  {Error|String} err
 * @returns {string}
 */
export default function formatESMsg(err) {
  let rootCause = _.get(err, 'resp.error.root_cause');
  if (!rootCause) {
    return; //undefined
  }

  let result = _.pluck(rootCause, 'reason').join('\n');
  return result;
};
