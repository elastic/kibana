/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import {
  INSTALLATION_STATUS_API_PATH,
  INSTALL_ALL_API_PATH,
  UNINSTALL_ALL_API_PATH,
  InstallationStatusResponse,
  PerformInstallResponse,
  UninstallResponse,
} from '../../../common/http_api/installation';

export class InstallationService {
  private readonly http: HttpSetup;

  constructor({ http }: { http: HttpSetup }) {
    this.http = http;
  }

  async getInstallationStatus(params: {
    inferenceId: string;
  }): Promise<InstallationStatusResponse> {
    const inferenceId = params?.inferenceId ?? defaultInferenceEndpoints.ELSER;

    const response = await this.http.get<InstallationStatusResponse>(INSTALLATION_STATUS_API_PATH, {
      query: { inferenceId },
    });

    return response;
  }

  async install(params: { inferenceId: string }): Promise<PerformInstallResponse> {
    const inferenceId = params?.inferenceId ?? defaultInferenceEndpoints.ELSER;

    const response = await this.http.post<PerformInstallResponse>(INSTALL_ALL_API_PATH, {
      body: JSON.stringify({ inferenceId }),
    });

    if (!response.installed) {
      throw new Error(
        `Installation did not complete successfully.${
          response.failureReason ? `\n${response.failureReason}` : ''
        }`
      );
    }
    return response;
  }

  async uninstall(params: { inferenceId: string }): Promise<UninstallResponse> {
    const inferenceId = params?.inferenceId ?? defaultInferenceEndpoints.ELSER;

    const response = await this.http.post<UninstallResponse>(UNINSTALL_ALL_API_PATH, {
      body: JSON.stringify({ inferenceId }),
    });

    return response;
  }
}
