/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import {
  STATUS_API_PATH,
  INSTALL_API_PATH,
  type StatusResponse,
  type InstallResponse,
} from '../../../common';

export class InstallationService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async getInstallationStatus(): Promise<StatusResponse> {
    return await this.http.get<StatusResponse>(STATUS_API_PATH);
  }

  async install(): Promise<InstallResponse> {
    return await this.http.post<InstallResponse>(INSTALL_API_PATH);
  }
}
