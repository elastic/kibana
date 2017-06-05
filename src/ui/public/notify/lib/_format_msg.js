import _ from 'lodash';
import { formatESMsg } from 'ui/notify/lib/_format_es_msg';
const has = _.has;

/**
 * Formats the error message from an error object, extended elasticsearch
 * object or simple string; prepends optional second parameter to the message
 * @param  {Error|String} err
 * @param  {String} from - Prefix for message indicating source (optional)
 * @returns {string}
 */
export function formatMsg(err, from) {
  let rtn = '';
  if (from) {
    rtn += from + ': ';
  }

  const esMsg = formatESMsg(err);

  if (typeof err === 'string') {
    rtn += err;
  } else if (esMsg) {
    rtn += esMsg;
  } else if (err instanceof Error) {
    rtn += formatMsg.describeError(err);
  } else if (has(err, 'status') && has(err, 'data')) {
    // is an Angular $http "error object"
    rtn += 'Error ' + err.status + ' ' + err.statusText + ': ' + err.data.message;
  }

  return rtn;
}

formatMsg.describeError = function (err) {
  if (!err) return undefined;
  if (err.body && err.body.message) return err.body.message;
  if (err.message) return err.message;
  return '' + err;
};

