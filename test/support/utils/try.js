
import bluebird from 'bluebird';

import {
  defaultTryTimeout
} from '../index';

import Log from './log.js';

class Try {

  tryForTime(timeout, block) {
    const start = Date.now();
    const retryDelay = 502;
    let lastTry = 0;
    let finalMessage;
    let prevMessage;

    function attempt() {
      lastTry = Date.now();

      if (lastTry - start > timeout) {
        throw new Error('tryForTime timeout: ' + finalMessage);
      }

      return bluebird
      .try(block)
      .catch(function tryForTimeCatch(err) {
        if (err.message === prevMessage) {
          Log.debug('--- tryForTime failed again with the same message  ...');
        } else {
          prevMessage = err.message;
          Log.debug('--- tryForTime failure: ' + prevMessage);
        }
        finalMessage = err.stack || err.message;
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
