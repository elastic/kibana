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
import expect from 'expect';
import { stripRequest } from '../../helpers/helpers';
import ConsolePage from '../../page_objects/console/console_page';
import HomePage from '../../page_objects/home/home_page';

describe('Console App', () => {
  // beforeEach(() => {});

  it('should show the default request', () => {
    browser.url('/');
    const homePage = new HomePage(browser);
    homePage.nav.navigateToConsole();

    const consolePage = new ConsolePage(browser);

    // Remove all spaces and new line characters to ensure that the content is the same.
    const requestData = stripRequest(consolePage.request);
    const defaultRequestData = stripRequest(consolePage.DEFAULT_REQUEST);
    expect(requestData).toBe(defaultRequestData);
  });

  it('default request response should include `"timed_out": false`', () => {
    browser.url('/');
    const homePage = new HomePage(browser);
    homePage.nav.navigateToConsole();

    const consolePage = new ConsolePage(browser);
    const expectedResponseContains = '"timed_out": false,';
    consolePage.clickPlay();

    const actualResponse = consolePage.response;
    expect(actualResponse).toContain(expectedResponseContains);
  });

  it('settings should allow changing the text size', () => {
    browser.url('/');
    const homePage = new HomePage(browser);
    homePage.nav.navigateToConsole();
    const consolePage = new ConsolePage(browser);
    const beginningFontSize = consolePage.requestFontSize;

    consolePage.changeFontSize(20);
    expect(consolePage.requestFontSize).not.toBe(beginningFontSize);
    expect(consolePage.requestFontSize).toBe('20px');

    consolePage.changeFontSize(24);
    expect(consolePage.requestFontSize).not.toBe('20px');
    expect(consolePage.requestFontSize).toBe('24px');
  });
});
