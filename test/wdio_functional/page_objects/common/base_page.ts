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
import { Client, Element, RawResult } from 'webdriverio';

export default class BasePage {
  protected driver: Client<void>;

  constructor(driver: any) {
    this.driver = driver;
  }

  public title(): string {
    return this.driver.getTitle();
  }

  public getElementText(selector: string): string {
    this.findElement(selector);
    return this.driver.getText(selector);
  }

  public click(selector: string): void {
    this.findElement(selector);
    this.driver.click(selector);
  }

  public clear(selector: string): void {
    this.findElement(selector);
    this.driver.clearElement(selector);
  }

  public findElement(selector: string): RawResult<Element> {
    this.driver.waitForExist(selector);
    this.driver.waitForVisible(selector);
    return this.driver.element(selector);
  }
  public findElements(selector: string): RawResult<Element[]> {
    this.driver.waitForExist(selector);
    return this.driver.elements(selector);
  }
  public type(clear = true, value: string, selector: string): void {
    if (clear) {
      this.clear(selector);
    }
    this.click(selector);
    this.driver.addValue(selector, value);
  }
}
