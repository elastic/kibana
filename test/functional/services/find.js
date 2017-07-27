export function FindProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');

  const defaultFindTimeout = config.get('timeouts.find');

  class Find {
    async byCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`findByCssSelector ${selector}`);
      const remoteWithTimeout = remote.setFindTimeout(timeout);
      const element = await remoteWithTimeout.findByCssSelector(selector);
      remoteWithTimeout.setFindTimeout(defaultFindTimeout);
      return element;
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

    async existsByLinkText(linkText) {
      log.debug(`existsByLinkText ${linkText}`);
      const remoteWithTimeout = remote.setFindTimeout(1000);
      const exists = await remoteWithTimeout.findDisplayedByLinkText(linkText)
        .then(() => true)
        .catch(() => false);
      remoteWithTimeout.setFindTimeout(defaultFindTimeout);
      return exists;
    }

    async existsByDisplayedByCssSelector(selector) {
      log.debug(`existsByDisplayedByCssSelector ${selector}`);
      const remoteWithTimeout = remote.setFindTimeout(1000);
      const exists = await remoteWithTimeout.findDisplayedByCssSelector(selector)
        .then(() => true)
        .catch(() => false);
      remoteWithTimeout.setFindTimeout(defaultFindTimeout);
      return exists;
    }

    async existsByCssSelector(selector) {
      log.debug(`existsByCssSelector ${selector}`);
      const remoteWithTimeout = remote.setFindTimeout(1000);
      const exists = await remoteWithTimeout.findByCssSelector(selector)
        .then(() => true)
        .catch(() => false);
      remoteWithTimeout.setFindTimeout(defaultFindTimeout);
      return exists;
    }
  }

  return new Find();
}
