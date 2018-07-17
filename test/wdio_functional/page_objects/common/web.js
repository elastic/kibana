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


export default class Web {

  constructor(driver) {
    this.driver = driver;
    this.logger = global.getService('log');
  }

  /**
   * @function getElementText
   * @param  {string} selector CSS or XPath Selector of Element.
   * @returns {string} The visible text of the element.
   */
  getElementText(selector) {
    this.findElement(selector);
    this.logger.verbose(`\nFound : ${selector}\n`);
    return this.driver.getText(selector).toString();
  }

  /**
   * @function getCssPropertyValue
   * @param  {string} selector CSS or XPath Selector of Element.
   * @param  {string} CSS property to retrieve the value of.
   * @returns {string} Value of given CSS property (i.e. white for color).
   */
  getCssPropertyValue(selector, property) {
    const cssValues = this.driver.getCssProperty(selector, property);
    return cssValues;
  }

  /**
   * @function click
   * @param  {string} selector CSS or XPath Selector of Element.
   */
  click(selector) {
    this.findElement(selector);
    this.logger.verbose(`\nClicking on: ${selector}\n`);
    this.driver.click(selector);
    this.logger.verbose(`\nClicked successfully`);
  }

  /**
   * @function clear
   * @param  {string} selector CSS or XPath Selector of Element.
   */
  clear(selector) {
    this.findElement(selector);
    this.logger.verbose(`\nClearing values from: ${selector}\n`);
    this.driver.clearElement(selector);
    this.logger.verbose(`\nCleared successfully`);
  }

  /**
   * @function findElement
   * @param  {string} selector CSS or XPath Selector of Element.
   * @returns {Object} A WebElement JSON object for element matching selector.
   * @throws ElementNotFound
   */
  findElement(selector) {
    this.logger.verbose(
      `\nChecking existance of element with selector: ${selector}\n`
    );
    this.driver.waitForExist(selector);
    this.logger.verbose(`\nIt exists.\n`);
    this.logger.verbose(
      `\nEnsuring visibility of element with selector: ${selector}\n`
    );
    this.driver.waitForVisible(selector);
    this.logger.verbose(`\nIt's visible\n`);
    return this.driver.element(selector);
  }
  /**
   * @function findElements
   * @param  {string} selector CSS or XPath Selector of Elements.
   * @returns {[Object]}       Array of WebElement JSON objects for all elements matching selector.
   * @throws ElementNotFound
   */
  findElements(selector) {
    this.logger.verbose(
      `\nChecking existance of all elements that match: ${selector}\n`
    );
    this.driver.waitForExist(selector);
    this.logger.verbose(`\nAt least one exists.\n`);
    return this.driver.elements(selector);
  }
  /**
   * @function type
   * @param {string}  selector CSS or XPath Selector of Element to type into.
   * @param {string}  value    The value to be typed into element.
   * @param {boolean} clear    Whether to clear current value first.
   */
  type(selector, value, clear = true) {
    if (clear) {
      this.clear(selector);
    }
    this.click(selector);
    for (let i = 0; i < value.length; i++) {
      this.driver.pause(100);
      this.driver.addValue(selector, value[i]);
    }
  }

  /**
   * @function exists
   * @param  {string} selector CSS or XPath Selector of Element.
   * @returns {boolean} Returns true if element exists on page, false otherwise.
   */
  exists(selector) {
    this.findElement(selector);
    return this.driver.isExisting(selector);
  }

  /**
   * @function isVisible
   * @param  {string} selector CSS or XPath Selector of Element.
   * @returns {boolean} true if element is visible, false otherwise
   */
  isVisible(selector) {
    this.findElement(selector);
    return this.driver.isVisible(selector);
  }

  /**
   * @function isEnabled
   * @param  {string} selector CSS or XPath Selector of Element.
   * @returns {boolean} true if element is enabled, false otherwise
   */
  isEnabled(selector) {
    this.findElement(selector);
    return this.driver.isEnabled(selector);
  }
  // protected waitForCondition(callback: () => boolean): void { }
}
