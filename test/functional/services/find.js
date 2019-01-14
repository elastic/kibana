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

import { LeadfootElementWrapper } from './lib/leadfoot_element_wrapper';

export function FindProvider({ getService }) {
  const log = getService('log');
  const config = getService('config');
  const leadfoot = getService('__leadfoot__');
  const retry = getService('retry');

  const WAIT_FOR_EXISTS_TIME = config.get('timeouts.waitForExists');
  const defaultFindTimeout = config.get('timeouts.find');
  const fixedHeaderHeight = config.get('layout.fixedHeaderHeight');

  const wrap = leadfootElement => (
    new LeadfootElementWrapper(leadfootElement, leadfoot, fixedHeaderHeight)
  );

  const wrapAll = leadfootElements => (
    leadfootElements.map(wrap)
  );

  class Find {
    async _withTimeout(timeout, block) {
      try {
        const leadfootWithTimeout = leadfoot.setFindTimeout(timeout);
        return await block(leadfootWithTimeout);
      } finally {
        leadfoot.setFindTimeout(defaultFindTimeout);
      }
    }

    async _ensureElement(getElementFunction) {
      return await retry.try(async () => {
        const element = await getElementFunction();
        // Calling any method forces a staleness check
        await element.isEnabled();
        return element;
      });
    }

    async _ensureElementWithTimeout(timeout, getElementFunction) {
      try {
        const leadfootWithTimeout = leadfoot.setFindTimeout(timeout);
        return await retry.try(async () => {
          const element = await getElementFunction(leadfootWithTimeout);
          // Calling any method forces a staleness check
          await element.isEnabled();
          return element;
        });
      } finally {
        leadfoot.setFindTimeout(defaultFindTimeout);
      }
    }

    async byName(selector, timeout = defaultFindTimeout) {
      log.debug(`find.byName(${selector})`);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findByName(selector));
      });
    }

    async byCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug(`findByCssSelector ${selector}`);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findByCssSelector(selector));
      });
    }

    async byClassName(selector, timeout = defaultFindTimeout) {
      log.debug(`findByCssSelector ${selector}`);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findByClassName(selector));
      });
    }

    async activeElement() {
      return wrap(await leadfoot.getActiveElement());
    }

    async setValue(selector, text) {
      log.debug(`find.setValue(${selector}, ${text})`);
      return await retry.try(async () => {
        const element = await this.byCssSelector(selector);
        await element.click();

        // in case the input element is actually a child of the testSubject, we
        // call clearValue() and type() on the element that is focused after
        // clicking on the testSubject
        const input = await this.activeElement();
        await input.clearValue();
        await input.type(text);
      });
    }

    async allByCustom(findAllFunction, timeout = defaultFindTimeout) {
      return await this._withTimeout(timeout, async leadfoot => {
        return await retry.try(async () => {
          let elements = await findAllFunction(leadfoot);
          if (!elements) elements = [];
          // Force isStale checks for all the retrieved elements.
          await Promise.all(elements.map(async element => await element.isEnabled()));
          return elements;
        });
      });
    }

    async allByLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('find.allByLinkText: ' + selector);
      return await this.allByCustom(
        async leadfoot => wrapAll(await leadfoot.findAllByLinkText(selector)),
        timeout
      );
    }

    async allByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in findAllByCssSelector: ' + selector);
      return await this.allByCustom(
        async leadfoot => wrapAll(await leadfoot.findAllByCssSelector(selector)),
        timeout
      );
    }

    async descendantExistsByCssSelector(selector, parentElement, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug('Find.descendantExistsByCssSelector: ' + selector);
      return await this.exists(
        async () => wrap(await parentElement.findDisplayedByCssSelector(selector)),
        timeout
      );
    }

    async descendantDisplayedByCssSelector(selector, parentElement) {
      log.debug('Find.descendantDisplayedByCssSelector: ' + selector);
      return await this._ensureElement(
        async () => wrap(await parentElement.findDisplayedByCssSelector(selector))
      );
    }

    async allDescendantDisplayedByCssSelector(selector, parentElement) {
      log.debug(`Find.allDescendantDisplayedByCssSelector(${selector})`);
      const allElements = await parentElement.findAllByCssSelector(selector);
      return await Promise.all(
        allElements.map((element) => (
          this._ensureElement(async () => wrap(element))
        ))
      );
    }

    async displayedByCssSelector(selector, timeout = defaultFindTimeout) {
      log.debug('in displayedByCssSelector: ' + selector);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findDisplayedByCssSelector(selector));
      });
    }

    async byLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('Find.byLinkText: ' + selector);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findByLinkText(selector));
      });
    }

    async findDisplayedByLinkText(selector, timeout = defaultFindTimeout) {
      log.debug('Find.byLinkText: ' + selector);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findDisplayedByLinkText(selector));
      });
    }

    async byPartialLinkText(partialLinkText, timeout = defaultFindTimeout) {
      log.debug(`find.byPartialLinkText(${partialLinkText})`);
      return await this._ensureElementWithTimeout(timeout, async leadfoot => {
        return wrap(await leadfoot.findByPartialLinkText(partialLinkText));
      });
    }

    async exists(findFunction, timeout = WAIT_FOR_EXISTS_TIME) {
      return await this._withTimeout(timeout, async leadfoot => {
        try {
          await findFunction(leadfoot);
          return true;
        } catch (error) {
          return false;
        }
      });
    }

    async existsByLinkText(linkText, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`existsByLinkText ${linkText}`);
      return await this.exists(async leadfoot => wrap(await leadfoot.findDisplayedByLinkText(linkText)), timeout);
    }

    async existsByDisplayedByCssSelector(selector, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`existsByDisplayedByCssSelector ${selector}`);
      return await this.exists(async leadfoot => wrap(await leadfoot.findDisplayedByCssSelector(selector)), timeout);
    }

    async existsByCssSelector(selector, timeout = WAIT_FOR_EXISTS_TIME) {
      log.debug(`existsByCssSelector ${selector}`);
      return await this.exists(async leadfoot => wrap(await leadfoot.findByCssSelector(selector)), timeout);
    }

    async clickByCssSelectorWhenNotDisabled(selector, { timeout } = { timeout: defaultFindTimeout }) {
      log.debug(`Find.clickByCssSelectorWhenNotDisabled`);

      // Don't wrap this code in a retry, or stale element checks may get caught here and the element
      // will never be re-grabbed.  Let errors bubble, but continue checking for disabled property until
      // it's gone.
      const element = await this.byCssSelector(selector, timeout);
      await element.moveMouseTo();

      const clickIfNotDisabled = async (element, resolve) => {
        const disabled = await element.getProperty('disabled');
        if (disabled) {
          log.debug('Element is disabled, try again');
          setTimeout(() => clickIfNotDisabled(element, resolve), 250);
        } else {
          await element.click();
          resolve();
        }
      };

      await new Promise(resolve => clickIfNotDisabled(element, resolve));
    }

    async clickByPartialLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByPartialLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.byPartialLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }

    async clickByLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.byLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }

    async byButtonText(buttonText, element = leadfoot, timeout = defaultFindTimeout) {
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
        return wrap(allButtons[index]);
      });
    }

    async clickByButtonText(buttonText, element = leadfoot, timeout = defaultFindTimeout) {
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
        await element.moveMouseTo();
        await element.click();
      });
    }
    async clickByDisplayedLinkText(linkText, timeout = defaultFindTimeout) {
      log.debug(`clickByDisplayedLinkText(${linkText})`);
      await retry.try(async () => {
        const element = await this.findDisplayedByLinkText(linkText, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }
    async clickDisplayedByCssSelector(selector, timeout = defaultFindTimeout) {
      await retry.try(async () => {
        const element = await this.findDisplayedByCssSelector(selector, timeout);
        await element.moveMouseTo();
        await element.click();
      });
    }
    async waitForDeletedByCssSelector(selector) {
      await leadfoot.waitForDeletedByCssSelector(selector);
    }
    async waitForAttributeToChange(selector, attribute, value) {
      retry.waitFor(`${attribute} to equal "${value}"`, async () => {
        const el = await this.byCssSelector(selector);
        return value === await el.getAttribute(attribute);
      });
    }
  }

  return new Find();
}
