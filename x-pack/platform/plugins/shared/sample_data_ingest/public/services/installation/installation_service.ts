/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import {
  STATUS_API_PATH,
  INSTALL_API_PATH,
  UNINSTALL_API_PATH,
  type StatusResponse,
  type InstalledResponse,
  type InstallingResponse,
} from '../../../common';
import { createSampleDataSet } from '../sample_data_set';

export class InstallationService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async getInstallationStatus(): Promise<StatusResponse> {
    return await this.http.get<StatusResponse>(STATUS_API_PATH);
  }

  async install(): Promise<InstallingResponse | InstalledResponse> {
    return await this.http.post<InstallingResponse | InstalledResponse>(INSTALL_API_PATH);
  }

  async uninstall(): Promise<void> {
    await this.http.delete(UNINSTALL_API_PATH);
  }

  /**
   * Returns the Elasticsearch documentation sample data set in the standard SampleDataSet format.
   * Returns null if the status cannot be fetched (e.g., plugin not available).
   */
  async getSampleDataSet(): Promise<SampleDataSet | null> {
    try {
      const statusResponse = await this.getInstallationStatus();
      return createSampleDataSet(statusResponse, this.http);
    } catch {
      return null;
    }
  }
}
