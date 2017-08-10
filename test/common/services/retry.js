import bluebird from 'bluebird';

export function RetryProvider({ getService }) {
  const config = getService('config');
  const log = getService('log');

  class Retry {
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
            log.debug('--- tryForTime failed again with the same message  ...');
          } else {
            prevMessage = err.message;
            log.debug('--- tryForTime failure: ' + prevMessage);
          }
          finalMessage = err.stack || err.message;
          return bluebird.delay(retryDelay).then(attempt);
        });
      }

      return bluebird.try(attempt);
    }

    try(block) {
      return this.tryForTime(config.get('timeouts.try'), block);
    }

    tryMethod(object, method, ...args) {
      return this.try(() => object[method](...args));
    }
  }

  return new Retry();
}
