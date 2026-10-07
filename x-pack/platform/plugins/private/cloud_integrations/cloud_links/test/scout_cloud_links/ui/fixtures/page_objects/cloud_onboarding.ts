/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout';

export interface OnboardingParams {
  token?: string;
  securityDetails?: string;
  resourceData?: string;
  next?: string;
  hash?: string;
}

export class CloudOnboardingPageObject {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async navigateWithParams({ token, securityDetails, resourceData, next, hash }: OnboardingParams) {
    const params = new URLSearchParams();
    if (token) params.set('onboarding_token', token);
    if (securityDetails) params.set('security', securityDetails);
    if (resourceData) params.set('resource_data', resourceData);
    if (next) params.set('next', next);

    const paramStr = params.toString();
    let path = paramStr ? `/app/cloud/onboarding?${paramStr}` : '/app/cloud/onboarding';
    if (hash) path += hash;

    await this.page.goto(this.kbnUrl.get(path));
    await this.page.testSubj.waitForSelector('userMenuButton', {
      state: 'visible',
      timeout: 20000,
    });
  }

  getCurrentPathname(): Promise<string> {
    return this.page.evaluate(() => window.location.pathname);
  }

  getCurrentHash(): Promise<string> {
    return this.page.evaluate(() => window.location.hash);
  }
}
