/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { setTimeout as setTimeoutAsync } from 'timers/promises';
import { FtrService } from '../ftr_provider_context';

export class LoginPageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');

  async login(user: string, pwd: string) {
    const loginType = process.env.VM || '';
    if (loginType.includes('oidc') || loginType.includes('saml')) {
      await this.samlLogin(user, pwd);
      return;
    }

    await this.regularLogin(user, pwd);
  }

  async logoutLogin(user: string, pwd: string) {
    await this.logout();
    await this.sleep(3002);
    await this.login(user, pwd);
  }

  async logout() {
    await this.testSubjects.click('userMenuButton');
    await this.sleep(500);
    await this.testSubjects.click('logoutLink');
    this.log.debug('### found and clicked log out--------------------------');
    await this.sleep(8002);
  }

  async sleep(sleepMilliseconds: number) {
    this.log.debug(`... sleep(${sleepMilliseconds}) start`);
    await setTimeoutAsync(sleepMilliseconds);
    this.log.debug(`... sleep(${sleepMilliseconds}) end`);
  }

  private async regularLogin(user: string, pwd: string) {
    await this.testSubjects.setValue('loginUsername', user);
    await this.testSubjects.setValue('loginPassword', pwd);
    await this.testSubjects.click('loginSubmit');
    await this.find.waitForDeletedByCssSelector('.kibanaWelcomeLogo');
    await this.find.byCssSelector('[data-test-subj="kibanaChrome"]', 60000); // 60 sec waiting
  }

  private async samlLogin(user: string, pwd: string) {
    try {
      await this.find.clickByButtonText('Login using SAML');
      await this.find.setValue('input[name="email"]', user);
      await this.find.setValue('input[type="password"]', pwd);
      await this.find.clickByCssSelector('.auth0-label-submit');
      await this.find.byCssSelector('[data-test-subj="kibanaChrome"]', 60000); // 60 sec waiting
    } catch (err) {
      this.log.debug(`${err} \nFailed to find Auth0 login page, trying the Auth0 last login page`);
      await this.find.clickByCssSelector('.auth0-lock-social-button');
    }
  }
}
