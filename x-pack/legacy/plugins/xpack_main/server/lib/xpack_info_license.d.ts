/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type LicenseType = 'oss' | 'basic' | 'trial' | 'standard' | 'basic' | 'gold' | 'platinum';

export declare class XPackInfoLicense {
  constructor(getRawLicense: () => any);

  public getUid(): string | undefined;
  public isActive(): boolean;
  public getExpiryDateInMillis(): number | undefined;
  public isOneOf(candidateLicenses: string[]): boolean;
  public getType(): LicenseType | undefined;
  public getMode(): string | undefined;
  public isActiveLicense(typeChecker: (mode: string) => boolean): boolean;
  public isBasic(): boolean;
  public isNotBasic(): boolean;
}
