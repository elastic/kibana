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

export function ShieldPageProvider({ getService }) {
  const find = getService('find');

  class ShieldPage {
    async login(user, pwd) {
      const userNameBox = await find.byCssSelector('#username');
      await userNameBox.sendKeys(user);
      const passwordBox = await find.byCssSelector('#password');
      await passwordBox.sendKeys(pwd);
      const button = await find.byCssSelector('button');
      await button.click();
    }
  }

  return new ShieldPage();
}
