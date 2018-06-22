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

import { Client, CssProperty, Element, RawResult } from 'webdriverio';

export default class Web {
  protected driver: Client<void>;

  constructor(driver: any) {
    this.driver = driver;
  }

  protected getElementText(selector: string): string {
    this.findElement(selector);
    return this.driver.getText(selector).toString();
  }

  protected getCssPropertyValue(
    selector: string,
    property: string
  ): CssProperty {
    const cssValues = this.driver.getCssProperty(selector, property);
    return cssValues;
  }

  protected click(selector: string): void {
    this.findElement(selector);
    this.driver.click(selector);
  }

  protected clear(selector: string): void {
    this.findElement(selector);
    this.driver.clearElement(selector);
  }

  protected findElement(selector: string): RawResult<Element> {
    this.driver.waitForExist(selector);
    this.driver.waitForVisible(selector);
    return this.driver.element(selector);
  }
  protected findElements(selector: string): RawResult<Element[]> {
    this.driver.waitForExist(selector);
    return this.driver.elements(selector);
  }
  protected type(selector: string, value: string, clear = true): void {
    if (clear) {
      this.clear(selector);
    }
    this.click(selector);
    this.driver.addValue(selector, value);
  }

  // protected waitForCondition(callback: () => boolean): void { }
}
