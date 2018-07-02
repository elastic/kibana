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
import { stripRequest } from '../../helpers/helpers';
import HomePage from '../../page_objects/home/home_page';

describe('Console App', function () {
  beforeEach(function () {
    this.driver = browser;
    this.driver.url('/');
    this.homePage = new HomePage(this.driver);
    this.consolePage = this.homePage.nav.navigateToConsole();
  });

  it('should show the default request', function () {
    // Remove all spaces and new line characters to ensure that the content is the same.
    const requestData = stripRequest(this.consolePage.request);
    const defaultRequestData = stripRequest(this.consolePage.DEFAULT_REQUEST);
    expect(requestData).toBe(defaultRequestData);
  });

  it('default request response should include `"timed_out": false`', function () {
    const expectedResponseContains = '"timed_out": false,';
    this.consolePage.clickPlay();

    const actualResponse = this.consolePage.response;
    expect(actualResponse).toContain(expectedResponseContains);
  });

  it('settings should allow changing the text size', function () {
    const beginningFontSize = this.consolePage.requestFontSize;

    this.consolePage.changeFontSize(20);
    expect(this.consolePage.requestFontSize).not.toBe(beginningFontSize);
    expect(this.consolePage.requestFontSize).toBe('20px');

    this.consolePage.changeFontSize(24);
    expect(this.consolePage.requestFontSize).not.toBe('20px');
    expect(this.consolePage.requestFontSize).toBe('24px');
  });
});
