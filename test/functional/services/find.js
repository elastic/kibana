/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

export function FindProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const remote = getService('remote');
  const retry = getService('retry');

  const defaultFindTimeout = config.get('timeouts.find');

  class Find {
    async _withTimeout(timeout, block) {
      try {
        const remoteWithTimeout = remote.setFindTimeout(timeout);
        return await block(remoteWithTimeout);
      } finally {
        remote.setFindTimeout(defaultFindTimeout);
      }
    }

    async _ensureElement(getElementFunction) {
      return await retry.try(async () => {
        const element = await getElementFunction();
        // Calling any method forces a staleness check
        element.isEnabled();
        return element;
      });
    }

    async _ensureElementWithTimeout(timeout, getElementFunction) {
      try {
        const remoteWithTimeout = remote.setFindTimeout(timeout);
        return await retry.try(async () => {
          const element = await getElementFunction(remoteWithTimeout);
          // Calling any method forces a staleness check
          element.isEnabled();
          return element;
        });
      } finally {
        remote.setFindTimeout(defaultFindTimeout);
      }
    }

    async byName(selector, timeout = defaultFindTimeout) {
      log.debug(`find.byName(${selector})`);
      return await this._ensureElementWithTimeout(timeout, async remote => {
        return await remote.findByName(selector);
      });
    }

    async byCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`findByCssSelector ${selector}`);
      return await this._ensureElementWithTimeout(timeout, async remote => {
        return await remote.findByCssSelector(selector);
      });
    }

    async setValue(selector, text) {
      return await retry.try(async () => {
        const element = await this.byCssSelector(selector);
        await element.click();

        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await remote.getActiveElement();
        await input.clearValue();
        await input.type(text);
      });
    }

    async allByCustom(findAllFunction, timeout = defaultFindTimeout) {
      return await this._withTimeout(timeout, async remote => {
        return await retry.try(async () => {
          let elements = await findAllFunction(remote);
          if (!elements) elements = [];
          // Force isStale checks for all the retrieved elements.
          await Promise.all(elements.map(async element => await element.isEnabled()));
          return elements;
        });
      });
    }

    async allByLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('find.allByLinkText: ' + selector);
      return await this.allByCustom(remote => remote.findAllByLinkText(selector), timeout);
    }

    async allByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in findAllByCssSelector: ' + selector);
      return await this.allByCustom(remote => remote.findAllByCssSelector(selector), timeout);
    }

    async descendantExistsByCssSelector(selector, parentElement, timeout = 1000) {
      log.debug('Find.descendantExistsByCssSelector: ' + selector);
      return await this.exists(async () => await parentElement.findDisplayedByCssSelector(selector), timeout);
    }

    async descendantDisplayedByCssSelector(selector, parentElement) {
      log.debug('Find.descendantDisplayedByCssSelector: ' + selector);
      return await this._ensureElement(async () => await parentElement.findDisplayedByCssSelector(selector));
    }

    async displayedByCssSelector(selector, timeout = defaultFindTimeout, parentElement) {
      log.debug('in displayedByCssSelector: ' + selector);
      return await this._ensureElementWithTimeout(timeout, async remote => {
        return await remote.findDisplayedByCssSelector(selector);
      }, parentElement);
    }

    async byLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('Find.byLinkText: ' + selector);
      return await this._ensureElementWithTimeout(timeout, async remote => {
        return await remote.findByLinkText(selector);
      });
    }

    async byPartialLinkText(partialLinkText, timeout = defaultFindTimeout) {
      log.debug(`find.byPartialLinkText(${partialLinkText})`);
      return await this._ensureElementWithTimeout(timeout, async remote => {
        return await remote.findByPartialLinkText(partialLinkText);
      });
    }

    async exists(findFunction, timeout = 1000) {
      return await this._withTimeout(timeout, async remote => {
        try {
          await findFunction(remote);
          return true;
        } catch (error) {
          return false;
        }
      });
    }

    async existsByLinkText(linkText, timeout = 1000) {
      log.debug(`existsByLinkText ${linkText}`);
      return await this.exists(async remote => await remote.findDisplayedByLinkText(linkText), timeout);
    }

    async existsByDisplayedByCssSelector(selector, timeout = 1000) {
      log.debug(`existsByDisplayedByCssSelector ${selector}`);
      return await this.exists(async remote => await remote.findDisplayedByCssSelector(selector), timeout);
    }

    async existsByCssSelector(selector, timeout = 1000) {
      log.debug(`existsByCssSelector ${selector}`);
      return await this.exists(async remote => await remote.findByCssSelector(selector), timeout);
    }

    async clickByPartialLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByPartialLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.byPartialLinkText(linkText, timeout);
        await remote.moveMouseTo(element);
        await element.click();
      });
    }

    async clickByLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.byLinkText(linkText, timeout);
        await remote.moveMouseTo(element);
        await element.click();
      });
    }

    async byButtonText(buttonText, element = remote, timeout = defaultFindTimeout) {
      log.debug(`byButtonText(${buttonText})`);
      return await retry.tryForTime(timeout, async () => {
        const allButtons = await element.findAllByTagName('button');
        const buttonTexts = await Promise.all(allButtons.map(async (el) => {
          return el.getVisibleText();
        }));
        const index = buttonTexts.findIndex(text => text.trim() === buttonText.trim());
        if (index === -1) {
          throw new Error('Button not found');
        }
        return allButtons[index];
      });
    }

    async clickByButtonText(buttonText, element = remote, timeout = defaultFindTimeout) {
      log.debug(`clickByButtonText(${buttonText})`);
      await retry.try(async () => {
        const button = await this.byButtonText(buttonText, element, timeout);
        await button.click();
      });
    }

    async clickByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`clickByCssSelector(${selector})`);
      await retry.try(async () => {
        const element = await this.byCssSelector(selector, timeout);
        await remote.moveMouseTo(element);
        await element.click();
      });
    }
  }

  return new Find();
}
