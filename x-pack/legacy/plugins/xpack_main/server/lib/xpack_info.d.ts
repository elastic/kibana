/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Server } from 'hapi';
import { XPackInfoLicense } from './xpack_info_license';

interface XPackFeature {
  isAvailable(): boolean;
  isEnabled(): boolean;
  registerLicenseCheckResultsGenerator(generator: (xpackInfo: XPackInfo) => void): void;
  getLicenseCheckResults(): any;
}

export interface XPackInfoOptions {
  clusterSource?: string;
  pollFrequencyInMillis: number;
}

export declare class XPackInfo {
  public license: XPackInfoLicense;

  constructor(server: Server, options: XPackInfoOptions);

  public isAvailable(): boolean;
  public isXpackUnavailable(): boolean;
  public unavailableReason(): string | Error;
  public onLicenseInfoChange(handler: () => void): void;
  public refreshNow(): Promise<this>;

  public feature(name: string): XPackFeature;

  public getSignature(): string;
  public toJSON(): any;
}
