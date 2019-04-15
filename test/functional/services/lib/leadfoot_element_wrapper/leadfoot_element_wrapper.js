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

import Keys from 'leadfoot/keys';
import { delay } from 'bluebird';
import { scrollIntoViewIfNecessary } from './scroll_into_view_if_necessary';

export class LeadfootElementWrapper {
  constructor(leadfootElement, leadfoot, fixedHeaderHeight) {
    if (leadfootElement instanceof LeadfootElementWrapper) {
      return leadfootElement;
    }

    this._leadfootElement = leadfootElement;
    this._leadfoot = leadfoot;
    this._fixedHeaderHeight = fixedHeaderHeight;
  }

  _wrap(otherLeadfootElement) {
    return new LeadfootElementWrapper(otherLeadfootElement, this._leadfoot, this._fixedHeaderHeight);
  }

  _wrapAll(otherLeadfootElements) {
    return otherLeadfootElements.map(e => this._wrap(e));
  }

  /**
   * Clicks the element. This method works on both mouse and touch platforms
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#click
   *
   * @return {Promise<void>}
   */
  async click() {
    await this.scrollIntoViewIfNecessary();
    await this._leadfootElement.click();
  }

  /**
   * Gets all elements inside this element matching the given CSS class name.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findAllByClassName
   *
   * @param {string} className
   * @return {Promise<LeadfootElementWrapper[]>}
   */
  async findAllByClassName(className) {
    return await this._wrapAll(
      await this._leadfootElement.findAllByClassName(className)
    );
  }

  /**
   * Clears the value of a form element.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#clearValue
   *
   * @return {Promise<void>}
   */
  async clearValue() {
    // https://bugs.chromium.org/p/chromedriver/issues/detail?id=2702
    // await this._leadfootElement.clearValue();
    await this._leadfoot.execute(`arguments[0].value=''`, [this._leadfootElement]);
  }

  /**
   * Clear the value of this element using Keyboard
   * @param { charByChar: false } options
   */
  async clearValueWithKeyboard(options = { charByChar: false }) {
    if (options.charByChar === true) {
      const value = await this.getProperty('value');
      for (let i = 1; i <= value.length; i++) {
        await this._leadfoot.pressKeys(Keys.BACKSPACE);
        await delay(100);
      }
    } else {
      if (process.platform === 'darwin') {
        await this._leadfoot.pressKeys([Keys.COMMAND, 'a']); // Select all Mac
      } else {
        await this._leadfoot.pressKeys([Keys.CONTROL, 'a']); // Select all for everything else
      }
      await this._leadfoot.pressKeys(Keys.NULL); // Release modifier keys
      await this._leadfoot.pressKeys(Keys.BACKSPACE); // Delete all content
    }
  }

  /**
   * Types into the element. This method works the same as the leadfoot/Session#pressKeys method
   * except that any modifier keys are automatically released at the end of the command. This
   * method should be used instead of leadfoot/Session#pressKeys to type filenames into file
   * upload fields.
   *
   * Since 1.5, if the WebDriver server supports remote file uploads, and you type a path to
   * a file on your local computer, that file will be transparently uploaded to the remote
   * server and the remote filename will be typed instead. If you do not want to upload local
   * files, use leadfoot/Session#pressKeys instead.
   *
   * @param {string|string[]} value
   * @return {Promise<void>}
   */
  async type(value) {
    await this._leadfootElement.type(value);
  }

  /**
   * Gets the first element inside this element matching the given CSS class name.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findByClassName
   *
   * @param {string} className
   * @return {Promise<LeadfootElementWrapper>}
   */
  async findByClassName(className) {
    return this._wrap(await this._leadfootElement.findByClassName(className));
  }

  /**
   * Returns whether or not the element would be visible to an actual user. This means
   * that the following types of elements are considered to be not displayed:
   *
   *  - Elements with display: none
   *  - Elements with visibility: hidden
   *  - Elements positioned outside of the viewport that cannot be scrolled into view
   *  - Elements with opacity: 0
   *  - Elements with no offsetWidth or offsetHeight
   *
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#isDisplayed
   *
   * @return {Promise<boolean>}
   */
  async isDisplayed() {
    return await this._leadfootElement.isDisplayed();
  }

  /**
   * Gets an attribute of the element.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getAttribute
   *
   * @param {string} name
   */
  async getAttribute(name) {
    return await this._leadfootElement.getAttribute(name);
  }

  /**
   * Gets the visible text within the element. <br> elements are converted to line breaks
   * in the returned text, and whitespace is normalised per the usual XML/HTML whitespace
   * normalisation rules.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getVisibleText
   *
   * @return {Promise<string>}
   */
  async getVisibleText() {
    return await this._leadfootElement.getVisibleText();
  }

  /**
   * Gets the tag name of the element. For HTML documents, the value is always lowercase.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getTagName
   *
   * @return {Promise<string>}
   */
  async getTagName() {
    return await this._leadfootElement.getTagName();
  }

  /**
   * Gets the position of the element relative to the top-left corner of the document,
   * taking into account scrolling and CSS transformations (if they are supported).
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getPosition
   *
   * @return {Promise<{x: number, y: number}>}
   */
  async getPosition() {
    return await this._leadfootElement.getPosition();
  }

  /**
   * Gets all elements inside this element matching the given CSS selector.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findAllByCssSelector
   *
   * @param {string} selector
   * @return {Promise<LeadfootElementWrapper[]>}
   */
  async findAllByCssSelector(selector) {
    return this._wrapAll(await this._leadfootElement.findAllByCssSelector(selector));
  }

  /**
   * Gets the first element inside this element matching the given CSS selector.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findByCssSelector
   *
   * @param {string} selector
   * @return {Promise<LeadfootElementWrapper>}
   */
  async findByCssSelector(selector) {
    return this._wrap(await this._leadfootElement.findByCssSelector(selector));
  }

  /**
   * Returns whether or not a form element can be interacted with.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#isEnabled
   *
   * @return {Promise<boolean>}
   */
  async isEnabled() {
    return await this._leadfootElement.isEnabled();
  }

  /**
   * Gets all elements inside this element matching the given HTML tag name.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findAllByTagName
   *
   * @param {string} tagName
   * @return {Promise<LeadfootElementWrapper[]>}
   */
  async findAllByTagName(tagName) {
    return this._wrapAll(await this._leadfootElement.findAllByTagName(tagName));
  }

  /**
   * Gets a property of the element.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getProperty
   *
   * @param {string} name
   * @return {Promise<any>}
   */
  async getProperty(name) {
    return await this._leadfootElement.getProperty(name);
  }

  /**
   * Moves the remote environment’s mouse cursor to this element. If the element is outside
   * of the viewport, the remote driver will attempt to scroll it into view automatically.
   * https://theintern.io/leadfoot/module-leadfoot_Session.html#moveMouseTo
   *
   * @param {number} xOffset optional - The x-offset of the cursor, maybe in CSS pixels, relative to the left edge of the specified element’s bounding client rectangle.
   * @param {number} yOffset optional - The y-offset of the cursor, maybe in CSS pixels, relative to the top edge of the specified element’s bounding client rectangle.
   * @return {Promise<void>}
   */
  async moveMouseTo(xOffset, yOffset) {
    await this.scrollIntoViewIfNecessary();
    return await this._leadfoot.moveMouseTo(this._leadfootElement, xOffset, yOffset);
  }

  /**
   * Gets a CSS computed property value for the element.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getComputedStyle
   *
   * @param {string} propertyName
   * @return {Promise<string>}
   */
  async getComputedStyle(propertyName) {
    return await this._leadfootElement.getComputedStyle(propertyName);
  }

  /**
   * Gets the size of the element, taking into account CSS transformations (if they are supported).
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getSize
   *
   * @return {Promise<{width: number, height: number}>}
   */
  async getSize() {
    return await this._leadfootElement.getSize();
  }

  /**
   * Gets the first element inside this element matching the given HTML tag name.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findByTagName
   *
   * @param {string} tagName
   * @return {Promise<LeadfootElementWrapper>}
   */
  async findByTagName(tagName) {
    return this._wrap(await this._leadfootElement.findByTagName(tagName));
  }

  /**
   * Returns whether or not a form element is currently selected (for drop-down options and radio buttons),
   * or whether or not the element is currently checked (for checkboxes).
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#isSelected
   *
   * @return {Promise<boolean>}
   */
  async isSelected() {
    return await this._leadfootElement.isSelected();
  }

  /**
   * Gets the first displayed element inside this element matching the given CSS selector. This is
   * inherently slower than leadfoot/Element#find, so should only be used in cases where the
   * visibility of an element cannot be ensured in advance.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findDisplayedByCssSelector
   *
   * @param {string} selector
   * @return {Promise<LeadfootElementWrapper>}
   */
  async findDisplayedByCssSelector(selector) {
    return this._wrap(await this._leadfootElement.findDisplayedByCssSelector(selector));
  }

  /**
   * Waits for all elements inside this element matching the given CSS class name to be destroyed.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#waitForDeletedByClassName
   *
   * @param {string} className
   * @return {Promise<void>}
   */
  async waitForDeletedByClassName(className) {
    await this._leadfootElement.waitForDeletedByClassName(className);
  }

  /**
   * Gets the first element inside this element partially matching the given case-insensitive link text.
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findByPartialLinkText
   *
   * @param {string} text
   * @return {Promise<LeadfootElementWrapper>}
   */
  async findByPartialLinkText(text) {
    return this._wrap(await this._leadfootElement.findByPartialLinkText(text));
  }

  /**
   * Gets a property or attribute of the element according to the WebDriver specification algorithm. Use of this method is not recommended; instead, use leadfoot/Element#getAttribute to retrieve DOM attributes and leadfoot/Element#getProperty to retrieve DOM properties.
   *
   * This method uses the following algorithm on the server to determine what value to return:
   *
   *  1. If name is 'style', returns the style.cssText property of the element.
   *  2. If the attribute exists and is a boolean attribute, returns 'true' if the attribute is true, or null otherwise.
   *  3. If the element is an <option> element and name is 'value', returns the value attribute if it exists, otherwise returns the visible text content of the option.
   *  4. If the element is a checkbox or radio button and name is 'selected', returns 'true' if the element is checked, or null otherwise.
   *  5. If the returned value is expected to be a URL (e.g. element is <a> and attribute is href), returns the fully resolved URL from the href/src property of the element, not the attribute.
   *  6. If name is 'class', returns the className property of the element.
   *  7. If name is 'readonly', returns 'true' if the readOnly property is true, or null otherwise.
   *  8. If name corresponds to a property of the element, and the property is not an Object, return the property value coerced to a string.
   *  9. If name corresponds to an attribute of the element, return the attribute value.
   *
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#getSpecAttribute
   *
   * @param {string} name
   * @return {Promise<string>}
   */
  async getSpecAttribute(name) {
    return await this._leadfootElement.getSpecAttribute(name);
  }

  /**
   * https://theintern.io/leadfoot/module-leadfoot_Element.html#findByXpath
   *
   * @deprecated
   * @param {string} xpath
   * @return {Promise<LeadfootElementWrapper>}
   */
  async findByXpath(xpath) {
    return this._wrap(await this._leadfootElement.findByXpath(xpath));
  }

  /**
   * Scroll the element into view, avoiding the fixed header if necessary
   *
   * @nonstandard
   * @return {Promise<void>}
   */
  async scrollIntoViewIfNecessary() {
    await this._leadfoot.execute(scrollIntoViewIfNecessary, [this._leadfootElement, this._fixedHeaderHeight]);
  }
}
