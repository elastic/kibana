/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ILicense, LicenseType } from '@kbn/licensing-plugin/server';
import { firstValueFrom, map, type Observable, ReplaySubject, type Subject } from 'rxjs';
import type { EmailService, HTMLEmail, PlainTextEmail } from './types';
import { PLUGIN_ID } from '../../common';

export class LicensedEmailService implements EmailService {
  private validLicense$: Subject<boolean> = new ReplaySubject(1);

  constructor(
    private emailService: EmailService,
    license$: Observable<ILicense>,
    private minimumLicense: LicenseType,
    private logger: Logger
  ) {
    // no need to explicitly unsubscribe as the license$ observable already completes on stop()
    license$.pipe(map((license) => this.checkValidLicense(license))).subscribe(this.validLicense$);
  }

  async sendPlainTextEmail(payload: PlainTextEmail): Promise<void> {
    if (await firstValueFrom(this.validLicense$, { defaultValue: false })) {
      await this.emailService.sendPlainTextEmail(payload);
    } else {
      throw new Error('The current license does not allow sending email notifications');
    }
  }

  async sendHTMLEmail(payload: HTMLEmail): Promise<void> {
    if (await firstValueFrom(this.validLicense$, { defaultValue: false })) {
      await this.emailService.sendHTMLEmail(payload);
    } else {
      throw new Error('The current license does not allow sending email notifications');
    }
  }

  private checkValidLicense(license: ILicense): boolean {
    const licenseCheck = license.check(PLUGIN_ID, this.minimumLicense);

    if (licenseCheck.state === 'valid') {
      this.logger.debug('Your current license allows sending email notifications');
      return true;
    }

    this.logger.warn(
      licenseCheck.message || 'The current license does not allow sending email notifications'
    );
    return false;
  }
}
