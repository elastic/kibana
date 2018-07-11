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

import { testSubjectifySelector } from '../../helpers/helpers';
import Web from './web';

export default class BasePage extends Web {

  constructor(driver) {
    super(driver);
    this.driver = driver;
  }

  get nav() {
    const self = this;
    return new class Navigation {
      constructor() {
        this.baseNavLinkSelector =
          '//a' + testSubjectifySelector('appLink', 'xpath');
        this.consoleNavLinkSelector =
          this.baseNavLinkSelector + '[@aria-label="Dev Tools"]';
      }
      navigateToConsole() {
        self.driver.click(this.consoleNavLinkSelector);
        const ConsolePage = require('../console/console_page');
        return new ConsolePage(self.driver);
      }

      navigateToHome() {
        self.driver.url('/');
        const HomePage = require('../home/home_page');
        return new HomePage(this.driver);
      }
    };
  }

  get title() {
    return this.driver.getTitle().toString();
  }
}
