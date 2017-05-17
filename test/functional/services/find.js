export function FindProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');

  const defaultFindTimeout = config.get('timeouts.find');

  class Find {
    byCssSelector(selector) {
      log.debug(`findByCssSelector ${selector}`);
      return remote
        .setFindTimeout(defaultFindTimeout)
        .findByCssSelector(selector);
    }

    async allByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in findAllByCssSelector: ' + selector);
      const remoteWithTimeout = remote.setFindTimeout(timeout);
      let elements = await remoteWithTimeout.findAllByCssSelector(selector);
      remoteWithTimeout.setFindTimeout(defaultFindTimeout);
      if (!elements) elements = [];
      log.debug(`Found ${elements.length} for selector ${selector}`);
      return elements;
    }

    async displayedByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in displayedByCssSelector: ' + selector);
      const remoteWithTimeout = remote.setFindTimeout(timeout);
      const element = await remoteWithTimeout.findDisplayedByCssSelector(selector);
      remoteWithTimeout.setFindTimeout(defaultFindTimeout);
      return element;
    }
  }

  return new Find();
}
