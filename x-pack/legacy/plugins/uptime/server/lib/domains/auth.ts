/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { get } from 'lodash';
import { UMAuthAdapter } from '../adapters/auth/adapter_types';

const supportedLicenses = ['basic', 'standard', 'gold', 'platinum', 'trial'];

export class UMAuthDomain {
  constructor(private readonly adapter: UMAuthAdapter, libs: {}) {
    this.adapter = adapter;
  }

  public requestIsValid(request: any): boolean {
    const license = this.adapter.getLicenseType();
    if (license === null) {
      throw Boom.badRequest('Missing license information');
    }
    if (!supportedLicenses.some(licenseType => licenseType === license)) {
      throw Boom.forbidden('License not supported');
    }
    if (this.adapter.licenseIsActive() === false) {
      throw Boom.forbidden('License not active');
    }

    return this.checkRequest(request);
  }

  private checkRequest(request: any): boolean {
    const authenticated = get(request, 'auth.isAuthenticated', null);
    if (authenticated === null) {
      throw Boom.forbidden('Missing authentication');
    }
    return authenticated;
  }
}
