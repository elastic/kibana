
import bluebird from 'bluebird';

import {
  defaultTryTimeout
} from '../index';

import Log from './log.js';

class Try {

  tryForTime(timeout, block) {
    var self = this;
    var start = Date.now();
    var retryDelay = 502;
    var lastTry = 0;
    var tempMessage;

    function attempt() {
      lastTry = Date.now();

      if (lastTry - start > timeout) {
        throw new Error('timeout ' + tempMessage);
      }

      return bluebird
      .try(block)
      .catch(function tryForTimeCatch(err) {
        Log.debug('tryForTime failure: ' + err.message);
        tempMessage = err.message;
        return bluebird.delay(retryDelay).then(attempt);
      });
    }

    return bluebird.try(attempt);
  }

  try(block) {
    return this.tryForTime(defaultTryTimeout, block);
  }

}

export default new Try();
