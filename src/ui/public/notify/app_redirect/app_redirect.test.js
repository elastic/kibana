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

import { addAppRedirectMessageToUrl, showAppRedirectNotification } from './app_redirect';

let isToastAdded = false;

jest.mock('../toasts', () => ({
  toastNotifications: {
    addDanger: () => {
      isToastAdded = true;
    },
  },
}));

describe('addAppRedirectMessageToUrl', () => {
  test('adds a message to the URL', () => {
    const url = addAppRedirectMessageToUrl('', 'redirect message');
    expect(url).toBe('#?app_redirect_message=redirect%20message');
  });
});

describe('showAppRedirectNotification', () => {
  beforeEach(() => {
    isToastAdded = false;
  });

  test(`adds a toast when there's a message in the URL`, () => {
    showAppRedirectNotification({
      search: () => ({ app_redirect_message: 'redirect message' }),
    });

    expect(isToastAdded).toBe(true);
  });

  test(`doesn't add a toast when there's no message in the URL`, () => {
    showAppRedirectNotification({
      search: () => ({ app_redirect_message: '' }),
    });

    expect(isToastAdded).toBe(false);
  });
});
