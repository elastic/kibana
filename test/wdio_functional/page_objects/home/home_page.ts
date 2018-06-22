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

import { Client } from 'webdriverio';
import BasePage from '../common/base_page';

export default class HomePage extends BasePage {
  private addDataHeaderSelector: string;
  constructor(driver: Client<void>) {
    super(driver);
    this.addDataHeaderSelector =
      '//h3[contains(@class, "euiTitle") and text()="Add Data to Kibana"]';
    this.init();
  }

  private init(): void {
    this.driver.waitForExist(this.addDataHeaderSelector);
    expect('Add Data to Kibana').toBe(
      this.getElementText(this.addDataHeaderSelector)
    );
    this.driver.waitUntil(() => {
      return this.title() === 'Kibana';
    });
  }
}
